import { redirect } from 'next/navigation';

export default function LegacyServiceBookingPage({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/dashboard/request-services/${params.id}/request`);
}
