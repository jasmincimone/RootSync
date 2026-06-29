import { redirect } from "next/navigation";

/** Courses are offered as vendor listings (Resource / Service types). */
export default function CoursesPage() {
  redirect("/rootsync");
}
