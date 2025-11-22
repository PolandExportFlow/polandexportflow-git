import fs from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'

const postsDirectory = path.join(process.cwd(), 'posts')

export interface Post {
  slug: string
  title: string
  date: string
  excerpt: string
  keywords: string[]
  image: string
  tags: string[]
  content?: string
}

export async function getAllPosts(): Promise<Post[]> {
  try {
    const filenames = await fs.readdir(postsDirectory) 
    const posts = await Promise.all(filenames
      .filter((filename) => filename.endsWith('.mdx')) 
      .map(async (filename) => {
        const filePath = path.join(postsDirectory, filename)

        const fileContents = await fs.readFile(filePath, 'utf8')
        const { data, content } = matter(fileContents)

        return {
          slug: filename.replace('.mdx', ''),
          title: data.title ?? 'Brak tytułu',
          date: data.date ?? 'Brak daty',
          excerpt: data.excerpt ?? 'Brak opisu',
          keywords: data.keywords ?? [],
          image: data.image ?? '/default.jpg',
          tags: data.tags ?? [],
          content,
        }
      }))

    const sortedPosts = posts.sort((a, b) => (a.date < b.date ? 1 : -1))

    console.log('getAllPosts:', sortedPosts)
    return sortedPosts
  } catch (error) {
    console.error('Błąd odczytu postów:', error)
    return []
  }
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const filePath = path.join(postsDirectory, `${slug}.mdx`)

  try {
    try {
      await fs.access(filePath)
    } catch {
      console.error(`Plik ${slug}.mdx nie istnieje.`)
      return null
    }

    const fileContents = await fs.readFile(filePath, 'utf8')
    const { data, content } = matter(fileContents)

    return {
      slug,
      title: data.title ?? 'Brak tytułu',
      date: data.date ?? 'Brak daty',
      excerpt: data.excerpt ?? 'Brak opisu',
      keywords: data.keywords ?? 'Brak keywordsow',
      image: data.image ?? '/default.jpg',
      tags: data.tags ?? [],
      content, 
    }
  } catch (error) {
    console.error(`Błąd odczytu pliku ${slug}.mdx:`, error)
    return null
  }
}
