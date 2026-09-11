import { Example } from "@/components/ui/black-hole";

export default function Default() {
  return (
    <div className="fixed inset-0 h-screen w-screen overflow-hidden bg-black">
      <Example />
    </div>
  );
}