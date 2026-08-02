import { notFound, redirect } from 'next/navigation'
import { categoryById, isCategoryId } from '@/lib/categories'
import { getItems, requireUser } from '@/lib/data'
import { CategoryView } from './category-view'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cat: string }>
}) {
  const { cat } = await params
  if (!isCategoryId(cat)) return { title: 'Not found · NetWorth' }
  return { title: `${categoryById(cat).name} · NetWorth` }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ cat: string }>
}) {
  const user = await requireUser()
  if (!user) redirect('/login')

  const { cat } = await params
  // The prototype silently fell back to the first category for an unknown id,
  // showing Liquid Cash under whatever name was in the URL.
  if (!isCategoryId(cat)) notFound()

  const items = await getItems()
  return <CategoryView cat={cat} items={items} />
}
