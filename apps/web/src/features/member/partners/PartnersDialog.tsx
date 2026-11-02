import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { PartnerList } from './PartnerList';

// The full list in a dialog
export function PartnersDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-lg">
        <DialogTitle className="sr-only">{t('partners.title')}</DialogTitle>
        <DialogDescription className="sr-only">
          {t('partners.title')}
        </DialogDescription>
        <PartnerList />
      </DialogContent>
    </Dialog>
  );
}
