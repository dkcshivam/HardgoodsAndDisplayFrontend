import { redirect } from "next/navigation";

// There is no landing page; the floor starts at the hardgoods catalogue.
export default function Home() {
  redirect("/products");
}
