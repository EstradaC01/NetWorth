/**
 * Proves Row Level Security isolates users at the database.
 *
 * This is the security test that matters: it drives the REST API as two real
 * authenticated users and asserts that neither can read or mutate the other's
 * rows — verified against the database, not through the UI, so it cannot be
 * fooled by an app-layer `where user_id = ...` filter.
 *
 * Run with the local stack up:  npx tsx scripts/verify-rls.mts
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

// Minimal .env.local reader — avoids a dotenv dependency for one script.
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = /^([A-Z_]+)=(.*)$/.exec(line.trim())
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!

let failures = 0
const check = (label: string, pass: boolean, detail = '') => {
  if (!pass) failures++
  console.log(`${pass ? '  ok  ' : 'FAIL  '}${label}${detail ? '  — ' + detail : ''}`)
}

const admin = createClient(URL, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function makeUser(email: string, password: string) {
  // Clean up any leftover from a previous run.
  const { data: list } = await admin.auth.admin.listUsers()
  const existing = list?.users.find((u) => u.email === email)
  if (existing) await admin.auth.admin.deleteUser(existing.id)

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) throw new Error(`createUser ${email}: ${error.message}`)

  const client = createClient(URL, ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error: signInErr } = await client.auth.signInWithPassword({
    email,
    password,
  })
  if (signInErr) throw new Error(`signIn ${email}: ${signInErr.message}`)

  return { id: data.user!.id, client }
}

async function main() {
  console.log('— setting up two users —')
  const alice = await makeUser('alice.rls@example.test', 'test-password-123')
  const bob = await makeUser('bob.rls@example.test', 'test-password-456')

  // Each user creates one item.
  const { data: aliceItem, error: aErr } = await alice.client
    .from('items')
    .insert({
      user_id: alice.id,
      cat: 'liquid',
      name: "Alice's savings",
      value_cents: 62000000,
    })
    .select()
    .single()
  check('alice can insert her own item', !aErr && !!aliceItem, aErr?.message)

  const { data: bobItem, error: bErr } = await bob.client
    .from('items')
    .insert({
      user_id: bob.id,
      cat: 'invest',
      name: "Bob's portfolio",
      value_cents: 124000000,
    })
    .select()
    .single()
  check('bob can insert his own item', !bErr && !!bobItem, bErr?.message)

  console.log('\n— isolation: reads —')
  const { data: aliceSees } = await alice.client.from('items').select('*')
  check('alice sees exactly her own row', aliceSees?.length === 1)
  check(
    "alice cannot see bob's row",
    !aliceSees?.some((r) => r.id === bobItem?.id)
  )

  const { data: targeted } = await alice.client
    .from('items')
    .select('*')
    .eq('id', bobItem!.id)
  check("alice targeting bob's id returns 0 rows", targeted?.length === 0)

  console.log('\n— isolation: writes —')
  const { data: updated } = await alice.client
    .from('items')
    .update({ name: 'HACKED' })
    .eq('id', bobItem!.id)
    .select()
  check("alice's update of bob's row affects 0 rows", updated?.length === 0)

  const { data: deleted } = await alice.client
    .from('items')
    .delete()
    .eq('id', bobItem!.id)
    .select()
  check("alice's delete of bob's row affects 0 rows", deleted?.length === 0)

  const { error: forgeErr } = await alice.client.from('items').insert({
    user_id: bob.id, // forging ownership
    cat: 'liquid',
    name: 'planted',
    value_cents: 1,
  })
  check('alice cannot insert a row owned by bob', !!forgeErr, forgeErr?.code)

  // Confirm bob's row survived all of the above, read back as bob.
  const { data: bobStill } = await bob.client
    .from('items')
    .select('*')
    .eq('id', bobItem!.id)
    .single()
  check("bob's row is intact", bobStill?.name === "Bob's portfolio")

  console.log('\n— isolation: snapshots —')
  await alice.client.from('snapshots').insert({
    user_id: alice.id,
    month: '2026-08-01',
    liquid_cents: 62000000,
  })
  const { data: bobSnaps } = await bob.client.from('snapshots').select('*')
  check("bob sees none of alice's snapshots", bobSnaps?.length === 0)

  console.log('\n— anonymous access —')
  const anon = createClient(URL, ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: anonItems } = await anon.from('items').select('*')
  check('anonymous read returns 0 rows', (anonItems?.length ?? 0) === 0)

  console.log('\n— constraints —')
  const { error: negErr } = await alice.client.from('items').insert({
    user_id: alice.id,
    cat: 'liquid',
    name: 'negative',
    value_cents: -1,
  })
  check('negative value_cents rejected', !!negErr, negErr?.code)

  const { error: catErr } = await alice.client.from('items').insert({
    user_id: alice.id,
    cat: 'liquids', // typo — enum should reject
    name: 'bad category',
    value_cents: 1,
  } as never)
  check('invalid category rejected by enum', !!catErr, catErr?.code)

  const { error: monthErr } = await alice.client.from('snapshots').insert({
    user_id: alice.id,
    month: '2026-08-15', // not the 1st
    liquid_cents: 0,
  })
  check('snapshot month must be the 1st', !!monthErr, monthErr?.code)

  // Tidy up.
  await admin.auth.admin.deleteUser(alice.id)
  await admin.auth.admin.deleteUser(bob.id)

  console.log(
    failures ? `\n${failures} CHECK(S) FAILED` : '\nall RLS checks passed'
  )
  process.exit(failures ? 1 : 0)
}

main().catch((e) => {
  console.error('\nerror:', e.message)
  process.exit(1)
})
