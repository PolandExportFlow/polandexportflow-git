import BlogPosts from '@/components/blog/BlogPosts'
import { getAllPosts } from '@/utils/getPosts'

export async function generateStaticParams() {
	const posts = await getAllPosts()
	return posts.map(post => ({ slug: post.slug }))
}

export default async function BlogPage() {
	const posts = await getAllPosts()

	return <BlogPosts posts={posts} />
}
