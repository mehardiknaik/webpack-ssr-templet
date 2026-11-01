// Fake network latency so SSR streaming / Suspense fallbacks are visible

interface User {
  name: string
  id: string
  email: string
}

async function fetchWrapper(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const response = await fetch(input, init);

  if (!response.ok) {
    throw new Error(
      `HTTP Error: ${response.status} ${response.statusText}`
    );
  }

  return response;
}

export async function fetchUsers(): Promise<User[]> {
  const res = await fetchWrapper(`https://jsonplaceholder.typicode.com/users`)
  return res.json();
}

export async function fetchUser(id: string): Promise<User | undefined> {
  const res = await fetchWrapper(`https://jsonplaceholder.typicode.com/users/${id}`)
  return res.json();
}
