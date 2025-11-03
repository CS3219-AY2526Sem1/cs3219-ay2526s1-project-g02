import ForgotPasswordModal from "@/components/ForgotPasswordModal";
import { PageLayout } from "@/components/layout";
import NavBar from "@/components/NavBar";

export default function ForgotPasswordPage() {
  return (
    <>
      <PageLayout header={<NavBar></NavBar>}>
        <ForgotPasswordModal />
      </PageLayout>
    </>
  );
}
