import { PageLayout } from "@/components/layout";
import LogInModal from "@/components/LoginModal";
import NavBar from "@/components/NavBar";

export default function LogInPage() {
  return (
    <>
      <PageLayout header={<NavBar></NavBar>}>
        <LogInModal />
      </PageLayout>
    </>
  );
}
