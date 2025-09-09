import Body from "@/componets/Body";
import Header from "@/componets/Header";
import Sidebar from "@/componets/Sidebar";


export default function Home() {
  return (
    <div className="flex flex-col h-screen w-screen">
      <div className="flex w-full justify-center">
        <Header />
      </div>
      <div className="flex h-full w-full">
        <Sidebar />
        <Body />
      </div>
    </div>
  );
}
