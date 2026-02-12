import { redirect } from 'next/navigation';

export default function SpaceIndexPage({ params }: { params: { spaceKey: string } }) {
  redirect(`/spaces/${params.spaceKey}/board`);
}
