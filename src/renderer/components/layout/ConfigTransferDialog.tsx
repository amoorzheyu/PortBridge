import { useEffect, useMemo, useState } from 'react';
import { Download, FileJson, LockKeyhole, Upload } from 'lucide-react';
import type { ConfigFileSummary, ConfigImportFileInfo } from '@shared/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/store/appStore';

type ConfigTransferMode = 'import' | 'export';

interface ConfigTransferDialogProps {
  mode: ConfigTransferMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Summary({ summary }: { summary: ConfigFileSummary }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="secondary">{summary.groups ?? 0} 个分组</Badge>
      <Badge variant="secondary">{summary.servers ?? 0} 台服务器</Badge>
      <Badge variant="secondary">{summary.tunnels ?? 0} 条映射</Badge>
    </div>
  );
}

export function ConfigTransferDialog({ mode, open, onOpenChange }: ConfigTransferDialogProps) {
  const { exportConfig, selectImportFile, inspectImportFile, previewImport, importConfig } = useAppStore();
  const [encrypt, setEncrypt] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedFile, setSelectedFile] = useState<ConfigImportFileInfo | null>(null);
  const [fileSummary, setFileSummary] = useState<ConfigFileSummary | null>(null);
  const [preview, setPreview] = useState<ConfigFileSummary | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isExport = mode === 'export';
  const title = isExport ? '导出配置' : '导入配置';
  const canImport = useMemo(() => {
    if (!selectedFile || !fileSummary) return false;
    if (!fileSummary.encrypted) return true;
    return password.trim().length > 0;
  }, [fileSummary, password, selectedFile]);

  useEffect(() => {
    if (!open) {
      setEncrypt(false);
      setPassword('');
      setConfirmPassword('');
      setSelectedFile(null);
      setFileSummary(null);
      setPreview(null);
      setError('');
      setSubmitting(false);
    }
  }, [open]);

  const handleExport = async () => {
    setError('');
    if (encrypt && password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setSubmitting(true);
    const path = await exportConfig(encrypt ? password : undefined);
    setSubmitting(false);
    if (path) onOpenChange(false);
  };

  const handleSelectFile = async () => {
    setError('');
    setPreview(null);
    setFileSummary(null);

    const file = await selectImportFile();
    if (!file) {
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setPassword('');

    try {
      const summary = await inspectImportFile(file.path);
      setFileSummary(summary);
      if (!summary.encrypted) setPreview(summary);
    } catch (error) {
      setFileSummary(null);
      setError(error instanceof Error ? error.message : '读取配置文件失败');
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !fileSummary) return;

    setError('');
    setSubmitting(true);
    try {
      const nextPreview = fileSummary.encrypted ? await previewImport(selectedFile.path, password) : preview;
      if (nextPreview) setPreview(nextPreview);
      await importConfig(selectedFile.path, fileSummary.encrypted ? password : undefined);
      setPassword('');
      onOpenChange(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : '导入失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px] space-y-5">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {isExport ? '导出当前全部分组、服务器和映射配置。' : '导入后会合并到当前配置，不会删除已有数据。'}
          </DialogDescription>
        </DialogHeader>

        {isExport ? (
          <div className="space-y-4">
            <div className="flex min-h-10 items-center justify-between rounded-md border px-3 py-2">
              <Label htmlFor="encrypt-config" className="text-sm font-medium">
                使用密码加密
              </Label>
              <Checkbox id="encrypt-config" checked={encrypt} onCheckedChange={(checked) => setEncrypt(checked === true)} />
            </div>

            {encrypt ? (
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="export-password">密码</Label>
                  <Input id="export-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="export-confirm-password">确认密码</Label>
                  <Input id="export-confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            <Button type="button" variant="outline" className="w-full justify-start" onClick={handleSelectFile}>
              <FileJson className="mr-2 h-4 w-4" />
              {selectedFile ? selectedFile.name : '选择 .pbconfig 文件'}
            </Button>

            {fileSummary?.encrypted ? (
              <div className="grid gap-2">
                <Label htmlFor="import-password" className="flex items-center gap-2">
                  <LockKeyhole className="h-4 w-4 text-muted-foreground" />
                  导入密码
                </Label>
                <Input id="import-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </div>
            ) : null}

            {preview ? <Summary summary={preview} /> : null}
          </div>
        )}

        {error ? <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div> : null}

        <DialogFooter className="pt-1">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          {isExport ? (
            <Button type="button" onClick={handleExport} disabled={submitting || (encrypt && (!password || !confirmPassword))}>
              <Download className="mr-2 h-4 w-4" />
              导出
            </Button>
          ) : (
            <Button type="button" onClick={handleImport} disabled={submitting || !canImport}>
              <Upload className="mr-2 h-4 w-4" />
              导入
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
