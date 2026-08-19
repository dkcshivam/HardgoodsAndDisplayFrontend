/**
 * No sidebar, no topbar. These screens exist to be printed, and the shell
 * would only have to be hidden again the moment the print dialog opened.
 */
export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen">{children}</div>;
}
