import { PageHeader } from "@/components/page-header";
import { CustomerForm } from "./customer-form";

export default function NewCustomerPage() {
  return (
    <main>
      <PageHeader title="New customer" back="/customers" />
      <CustomerForm />
    </main>
  );
}
