import { PageLayout } from "@/components/layout";
import NavBar from "@/components/NavBar";
import RegisterModal from "@/components/RegisterModal";

export default function RegisterPage() {
  return (
    <>
      <PageLayout header={<NavBar></NavBar>}>
        <RegisterModal />
      </PageLayout>
    </>
  );
}
