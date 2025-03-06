import AppBar from "@/components/AppBar";
import Canvas from "@/components/canvas";
import ChatBox from "@/components/chat";

export default function Home() {
  return (
    <div className="flex flex-col h-screen bg-neutral-900">
      <main className="flex flex-grow overflow-hidden">
        <div className="flex-1 overflow-hidden rounded-lg m-2">
          <div className="h-full flex justify-center items-center">
            <Canvas />
          </div>
        </div>
        <div className="w-80 overflow-hidden m-2">
          <ChatBox />
        </div>
      </main>
      <AppBar />
    </div>
  );
}