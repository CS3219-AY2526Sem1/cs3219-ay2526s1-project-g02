import LogInModal from "@/components/LoginModal";

export default function LogInPage() {
  return (
    <>
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-[#f3f4f6] via-[#e5e7eb] to-[#d1d5db]"></div>

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[#1118270d] backdrop-blur-[2px]"></div>

        <LogInModal></LogInModal>
      </div>
    </>
  );
}
