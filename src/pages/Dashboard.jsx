import { useEffect, useState } from 'react'
import { Plus, Sun, Moon, LogOut, Image, Layers } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useTheme } from '../context/ThemeContext'
import { theme } from '../lib/theme'
import DeckCard from '../components/DeckCard'
import DeckModal from '../components/DeckModal'
import DeleteDialog from '../components/DeleteDialog'
import EditMemberModal from '../components/EditMemberModal'

export default function Dashboard() {
  const { dark, setDark } = useTheme()
  const c = theme(dark)

  const [cardView, setCardView] = useState(() => localStorage.getItem('cardView') || 'thumbnail')

  function toggleView(v) {
    setCardView(v)
    localStorage.setItem('cardView', v)
  }

  const [decks, setDecks] = useState([])
  const [members, setMembers] = useState([])
  const [loadingDecks, setLoadingDecks] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editDeck, setEditDeck] = useState(null)
  const [deleteDeck, setDeleteDeck] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [editMember, setEditMember] = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoadingDecks(true)
    const [deckRes, memberRes] = await Promise.all([
      supabase.from('decks').select('*, member_one:member_one_id(*), member_two:member_two_id(*)').order('date_added', { ascending: false }),
      supabase.from('members').select('*').order('name'),
    ])
    if (deckRes.data) setDecks(deckRes.data)
    if (memberRes.data) setMembers(memberRes.data)
    setLoadingDecks(false)
  }

  async function handleLogout() { await supabase.auth.signOut() }

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
    await supabase.from('decks').delete().eq('id', deleteDeck.id)
    setDecks(prev => prev.filter(d => d.id !== deleteDeck.id))
    setDeleteLoading(false)
    setDeleteDeck(null)
  }

  function handleMemberUpdated(updated) {
    setDecks(prev => prev.map(deck => ({
      ...deck,
      member_one: deck.member_one?.id === updated.id ? updated : deck.member_one,
      member_two: deck.member_two?.id === updated.id ? updated : deck.member_two,
    })))
    setMembers(prev => prev.map(m => m.id === updated.id ? updated : m))
  }

  return (
    <div className="min-h-screen" style={{ background: c.bg }}>

      {/* Header */}
      <header style={{ background: c.bg, borderBottom: `1px solid ${c.border}` }}>
        <div className="max-w-5xl mx-auto px-8 h-14 flex items-center justify-between">
          <span className="font-display text-base font-bold tracking-tight" style={{ color: c.text }}>
            Mtel Pitch
          </span>
          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex items-center rounded-lg p-0.5" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
              <ViewBtn active={cardView === 'thumbnail'} onClick={() => toggleView('thumbnail')} c={c} title="Thumbnail view">
                <Image size={13} />
              </ViewBtn>
              <ViewBtn active={cardView === 'gradient'} onClick={() => toggleView('gradient')} c={c} title="Gradient view">
                <Layers size={13} />
              </ViewBtn>
            </div>

            <div className="flex items-center gap-1">
              <IconBtn onClick={() => setDark(d => !d)} c={c} title={dark ? 'Light mode' : 'Dark mode'}>
                {dark ? <Sun size={15} /> : <Moon size={15} />}
              </IconBtn>
              <IconBtn onClick={handleLogout} c={c} title="Sign out">
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
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-44 animate-pulse" style={{ background: c.surface, border: `1px solid ${c.borderLight}` }} />
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
                dark={dark}
                cardView={cardView}
                onEdit={() => setEditDeck(deck)}
                onDelete={() => setDeleteDeck(deck)}
                onMemberClick={m => setEditMember(m)}
              />
            ))}
          </div>
        )}
      </main>

      {showAdd    && <DeckModal members={members} onClose={() => setShowAdd(false)} onSaved={handleDeckSaved} dark={dark} />}
      {editDeck   && <DeckModal deck={editDeck} members={members} onClose={() => setEditDeck(null)} onSaved={handleDeckSaved} dark={dark} />}
      {deleteDeck && <DeleteDialog deckName={deleteDeck.client_name} loading={deleteLoading} onConfirm={handleDelete} onCancel={() => setDeleteDeck(null)} dark={dark} />}
      {editMember && <EditMemberModal member={editMember} onClose={() => setEditMember(null)} onSaved={handleMemberUpdated} dark={dark} />}
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

function ViewBtn({ children, active, onClick, c, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded-md transition-all"
      style={{
        color: active ? c.text : c.muted,
        background: active ? c.bg : 'transparent',
        boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
      }}
    >
      {children}
    </button>
  )
}
