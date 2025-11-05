import { PageLayout } from "@/components/layout";
import NavBar from "@/components/NavBar";
import UpdatePasswordModal from "@/components/UpdatePasswordModal";

export default function UpdatePasswordPage() {
  return (
    <>
      <PageLayout header={<NavBar></NavBar>}>
        <UpdatePasswordModal isForgot={true} />
      </PageLayout>
    </>
  );
}
