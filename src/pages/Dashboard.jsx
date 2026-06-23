import { useEffect, useState } from 'react'
import { Plus, LogOut, Sun, Moon, Users } from 'lucide-react'
import { mockAuth } from '../lib/mockAuth'
import { listDecks, listMembers, deleteDeckById, removeMemberFromDecks, deleteMemberById } from '../lib/mockDb'
import { useTheme } from '../context/ThemeContext'
import { theme } from '../lib/theme'
import DeckCard from '../components/DeckCard'
import DeckModal from '../components/DeckModal'
import DeleteDialog from '../components/DeleteDialog'
import LogoutDialog from '../components/LogoutDialog'
import EditMemberModal from '../components/EditMemberModal'
import ManageMembersModal from '../components/ManageMembersModal'
import DeleteMemberDialog from '../components/DeleteMemberDialog'

export default function Dashboard() {
  const { dark, setDark } = useTheme()
  const c = theme(dark)

  const [decks, setDecks] = useState([])
  const [members, setMembers] = useState([])
  const [loadingDecks, setLoadingDecks] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editDeck, setEditDeck] = useState(null)
  const [deleteDeck, setDeleteDeck] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [editMember, setEditMember] = useState(null)
  const [showMembers, setShowMembers] = useState(false)
  const [deleteMember, setDeleteMember] = useState(null)
  const [deleteMemberLoading, setDeleteMemberLoading] = useState(false)
  const [showLogout, setShowLogout] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoadingDecks(true)
    const [deckData, memberData] = await Promise.all([listDecks(), listMembers()])
    setDecks(deckData)
    setMembers(memberData)
    setLoadingDecks(false)
  }

  async function handleLogout() {
    await mockAuth.signOut()
    setShowLogout(false)
  }

  function handleDeckSaved(saved) {
    setDecks(prev => {
      const exists = prev.find(d => d.id === saved.id)
      return exists ? prev.map(d => d.id === saved.id ? saved : d) : [saved, ...prev]
    })
    fetchAll()
  }

  async function handleDelete() {
    if (!deleteDeck) return
    setDeleteLoading(true)
    await deleteDeckById(deleteDeck.id)
    setDecks(prev => prev.filter(d => d.id !== deleteDeck.id))
    setDeleteLoading(false)
    setDeleteDeck(null)
  }

  function handleMemberUpdated(updated) {
    setMembers(prev => prev.map(m => m.id === updated.id ? updated : m))
  }

  function handleMemberCreated(created) {
    setMembers(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
  }

  const affectedDecks = deleteMember ? decks.filter(d => d.member_ids?.includes(deleteMember.id)) : []

  async function handleDeleteMember() {
    if (!deleteMember) return
    setDeleteMemberLoading(true)

    await removeMemberFromDecks(deleteMember.id, affectedDecks.map(d => d.id))
    await deleteMemberById(deleteMember.id)

    setDecks(prev => prev.map(d =>
      affectedDecks.find(ad => ad.id === d.id)
        ? { ...d, member_ids: d.member_ids.filter(id => id !== deleteMember.id) }
        : d
    ))
    setMembers(prev => prev.filter(m => m.id !== deleteMember.id))
    setDeleteMemberLoading(false)
    setDeleteMember(null)
  }

  return (
    <div className="min-h-screen" style={{ background: c.bg }}>

      {/* Header */}
      <header style={{ background: c.bg, borderBottom: `1px solid ${c.border}` }}>
        <div className="max-w-5xl mx-auto px-8 h-14 flex items-center justify-between">
          <span className="font-display text-base font-bold tracking-tight" style={{ color: c.text }}>
            Pitch <span style={{ color: c.muted }}>(Demo)</span>
          </span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center p-0.5" style={{ background: c.surface, border: `1px solid ${c.borderLight}` }}>
                <ThemeTab active={!dark} onClick={() => setDark(false)} c={c} title="Light mode"><Sun size={12} /></ThemeTab>
                <ThemeTab active={dark}  onClick={() => setDark(true)}  c={c} title="Dark mode"><Moon size={12} /></ThemeTab>
              </div>
              <IconBtn onClick={() => setShowMembers(true)} c={c} title="Manage members">
                <Users size={15} />
              </IconBtn>
              <IconBtn onClick={() => setShowLogout(true)} c={c} title="Sign out">
                <LogOut size={15} />
              </IconBtn>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-8 py-10">
        {/* Section heading with yellow rule */}
        <div className="flex items-end justify-between mb-8 pb-4" style={{ borderBottom: `2px solid ${c.accent}` }}>
          <div className="flex items-baseline gap-3">
            <h1 className="font-display text-3xl font-bold tracking-tight" style={{ color: c.text }}>Decks</h1>
            {!loadingDecks && (
              <span className="text-xs" style={{ color: c.muted }}>{decks.length}</span>
            )}
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-80"
            style={{ background: c.text, color: c.bg }}
          >
            <Plus size={12} />
            Add deck
          </button>
        </div>

        {loadingDecks ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <DeckCardSkeleton key={i} dark={dark} delay={`${i * 80}ms`} />
            ))}
          </div>
        ) : decks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <p className="text-sm font-medium mb-2" style={{ color: c.text }}>No decks yet</p>
            <p className="text-sm mb-8" style={{ color: c.muted }}>Add your first pitch deck to get started.</p>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold"
              style={{ background: c.text, color: c.bg }}
            >
              <Plus size={12} />
              Add deck
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {decks.map(deck => (
              <DeckCard
                key={deck.id}
                deck={deck}
                members={members}
                dark={dark}
                onEdit={() => setEditDeck(deck)}
                onDelete={() => setDeleteDeck(deck)}
              />
            ))}
          </div>
        )}
      </main>

      {showAdd    && <DeckModal members={members} onClose={() => setShowAdd(false)} onSaved={handleDeckSaved} dark={dark} />}
      {editDeck   && <DeckModal deck={editDeck} members={members} onClose={() => setEditDeck(null)} onSaved={handleDeckSaved} dark={dark} />}
      {deleteDeck && <DeleteDialog deckName={deleteDeck.client_name} loading={deleteLoading} onConfirm={handleDelete} onCancel={() => setDeleteDeck(null)} dark={dark} />}
      {showMembers && (
        <ManageMembersModal
          members={members}
          onClose={() => setShowMembers(false)}
          onEdit={m => setEditMember(m)}
          onDelete={m => setDeleteMember(m)}
          onCreated={handleMemberCreated}
          dark={dark}
        />
      )}
      {editMember && <EditMemberModal member={editMember} onClose={() => setEditMember(null)} onSaved={handleMemberUpdated} dark={dark} />}
      {deleteMember && (
        <DeleteMemberDialog
          memberName={deleteMember.name}
          deckCount={affectedDecks.length}
          loading={deleteMemberLoading}
          onConfirm={handleDeleteMember}
          onCancel={() => setDeleteMember(null)}
          dark={dark}
        />
      )}
      {showLogout && <LogoutDialog onConfirm={handleLogout} onCancel={() => setShowLogout(false)} dark={dark} />}
    </div>
  )
}

function IconBtn({ children, onClick, c, title }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-2 transition-colors"
      style={{ color: hov ? c.text : c.muted, background: 'transparent' }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {children}
    </button>
  )
}

function ThemeTab({ children, active, onClick, c, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 transition-all"
      style={{
        color: active ? c.text : c.muted,
        background: active ? c.bg : 'transparent',
        borderBottom: '2px solid transparent',
      }}
    >
      {children}
    </button>
  )
}

function DeckCardSkeleton({ dark, delay = '0ms' }) {
  const c = theme(dark)
  const fill = { background: dark ? '#252525' : '#ebebeb' }
  return (
    <div
      className="flex flex-col overflow-hidden animate-pulse"
      style={{ background: c.card, border: `1px solid ${c.borderLight}`, animationDelay: delay }}
    >
      {/* Thumbnail */}
      <div style={{ aspectRatio: '16/9', ...fill }} />

      {/* Body */}
      <div className="flex flex-col gap-3 p-4 flex-1">
        <div style={{ height: 13, width: '58%', ...fill }} />
        <div className="flex gap-2">
          <div style={{ height: 18, width: 60, ...fill }} />
          <div style={{ height: 18, width: 52, ...fill }} />
        </div>
        <div
          className="flex items-center justify-between pt-1 mt-auto"
          style={{ borderTop: `1px solid ${c.borderLight}` }}
        >
          <div style={{ height: 10, width: 112, ...fill }} />
          <div className="flex gap-3">
            <div style={{ height: 12, width: 12, ...fill }} />
            <div style={{ height: 12, width: 12, ...fill }} />
          </div>
        </div>
      </div>
    </div>
  )
}

