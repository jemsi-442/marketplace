import { redirect } from 'next/navigation';

export default function LegacyServiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/dashboard/request-services/${params.id}`);
}
