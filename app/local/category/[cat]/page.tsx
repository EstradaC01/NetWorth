import { notFound } from 'next/navigation'
import { LocalApp } from '@/components/local-app'
import { isCategoryId } from '@/lib/categories'
export default async function LocalCategoryPage({ params }: { params: Promise<{ cat: string }> }) { const { cat } = await params; if (!isCategoryId(cat)) notFound(); return <LocalApp screen="category" cat={cat} /> }
