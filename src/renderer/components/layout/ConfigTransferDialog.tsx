import { useEffect, useMemo, useState } from 'react';
import { Download, FileJson, LockKeyhole, Upload } from 'lucide-react';
import type { ConfigFileSummary, ConfigImportFileInfo } from '@shared/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
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
  const conflictCount = summary.conflicts?.length ?? 0;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{summary.groups ?? 0} 个分组</Badge>
        <Badge variant="secondary">{summary.servers ?? 0} 台服务器</Badge>
        <Badge variant="secondary">{summary.tunnels ?? 0} 条映射</Badge>
      </div>
      {conflictCount > 0 ? <Badge variant="destructive">{conflictCount} 项同名配置待确认</Badge> : null}
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
  const [overwriteOpen, setOverwriteOpen] = useState(false);

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
      setOverwriteOpen(false);
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
      if (summary.encrypted) {
        setFileSummary(summary);
        return;
      }

      const nextPreview = await previewImport(file.path);
      setFileSummary(nextPreview);
      setPreview(nextPreview);
    } catch (error) {
      setFileSummary(null);
      setError(error instanceof Error ? error.message : '读取配置文件失败');
    }
  };

  const runImport = async (overwriteConflicts: boolean) => {
    if (!selectedFile || !fileSummary) return;

    setError('');
    setSubmitting(true);
    try {
      const nextPreview = await previewImport(selectedFile.path, fileSummary.encrypted ? password : undefined);
      if (nextPreview) setPreview(nextPreview);
      if (!overwriteConflicts && (nextPreview.conflicts?.length ?? 0) > 0) {
        setOverwriteOpen(true);
        return;
      }

      await importConfig(selectedFile.path, fileSummary.encrypted ? password : undefined, overwriteConflicts);
      setPassword('');
      setOverwriteOpen(false);
      onOpenChange(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : '导入失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleImport = async () => runImport(false);

  const handleOverwrite = async () => runImport(true);

  const conflictCount = preview?.conflicts?.length ?? 0;
  const conflictNames = preview?.conflicts?.slice(0, 3).map((conflict) => `${conflict.parentName} / ${conflict.name}`) ?? [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[520px] space-y-5">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {isExport ? '导出当前全部分组、服务器和映射配置。' : '导入会新增缺失配置；同名且相同的配置会自动跳过。'}
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

      <AlertDialog open={overwriteOpen} onOpenChange={setOverwriteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>覆盖同名配置？</AlertDialogTitle>
            <AlertDialogDescription>
              发现 {conflictCount} 项同名但内容不同的配置。确认后会覆盖这些配置；新增和未变化的配置会继续按规则处理。
              {conflictNames.length > 0 ? ` 包含：${conflictNames.join('、')}${conflictCount > conflictNames.length ? ' 等' : ''}。` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleOverwrite} disabled={submitting}>
              覆盖
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
