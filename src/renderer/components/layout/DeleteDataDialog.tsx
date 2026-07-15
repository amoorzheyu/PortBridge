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
import { useAppStore } from '@/store/appStore';

interface DeleteDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteDataDialog({ open, onOpenChange }: DeleteDataDialogProps) {
  const { deleteAllData, deleteEmptyGroups } = useAppStore();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[440px] p-5" onOpenAutoFocus={(event) => event.preventDefault()}>
        <AlertDialogHeader className="space-y-3">
          <AlertDialogTitle className="text-xl">删除数据</AlertDialogTitle>
          <AlertDialogDescription className="leading-6">
            选择要删除的数据范围。删除所有数据会清空分组、服务器和映射配置。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 gap-3">
          <AlertDialogCancel className="h-9 min-w-20 focus-visible:ring-0">取消</AlertDialogCancel>
          <AlertDialogAction
            className="h-9 min-w-32 border border-destructive bg-transparent text-destructive hover:bg-destructive/10 focus-visible:ring-0"
            onClick={() => void deleteEmptyGroups()}
          >
            删除空分组
          </AlertDialogAction>
          <AlertDialogAction
            className="h-9 min-w-32 bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-0"
            onClick={() => void deleteAllData()}
          >
            删除所有数据
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
