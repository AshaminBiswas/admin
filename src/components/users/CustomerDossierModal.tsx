import React from "react";
import { CustomerDossierPage } from "../../pages/CustomerDossierPage";

export interface CustomerDossierModalProps {
  userId: string | null;
  onClose: () => void;
  onNavigateB2BPricing?: (userId: string) => void;
  onOpenEdit?: (user: any) => void;
}

export function CustomerDossierModal({
  userId,
  onClose,
  onNavigateB2BPricing,
  onOpenEdit,
}: CustomerDossierModalProps) {
  return (
    <CustomerDossierPage
      userId={userId}
      onBack={onClose}
      onNavigateB2BPricing={onNavigateB2BPricing}
      onOpenEdit={onOpenEdit}
    />
  );
}

export { CustomerDossierPage };
export default CustomerDossierPage;
