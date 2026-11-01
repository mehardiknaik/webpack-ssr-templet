// Fake network latency so SSR streaming / Suspense fallbacks are visible

interface User {
  name: string
  id: string
  email: string
}


export async function fetchUsers(): Promise<User[]> {
  const res = await fetch(`https://jsonplaceholder.typicode.com/users`)
  return res.json();
}

export async function fetchUser(id: string): Promise<User | undefined> {
  const res = await fetch(`https://jsonplaceholder.typicode.com/users/${id}`)
  return res.json();
}
