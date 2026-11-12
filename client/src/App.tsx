import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Routes, Route, useNavigate, Navigate, useLocation } from "react-router-dom";
import { Plane, LayoutDashboard, Users, UserRoundSearch, MapPinned, FileText, CheckSquare, Building2, Sparkles, LogOut, Plus, Search, Bell, ArrowUpRight, TrendingUp, CalendarDays, Menu, X, Send, ChevronRight, ChevronDown, CircleDollarSign, Ticket, UserRound, CreditCard, Pencil, UserRoundPlus, Save } from "lucide-react";
import { api, getToken } from "./api";
import FlightSearch from "./FlightSearch";

type AnyRecord = Record<string, any>;
const nav = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/leads", label: "Leads", icon: UserRoundSearch },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/trips", label: "Trips & itineraries", icon: MapPinned },
  { to: "/quotes", label: "Quotes", icon: FileText },
  { to: "/bookings", label: "Flight bookings", icon: Ticket },
  { to: "/passengers", label: "Passengers", icon: UserRound },
  { to: "/flight-search", label: "Flight search", icon: Plane },
  { to: "/tasks", label: "Tasks & follow-ups", icon: CheckSquare },
  { to: "/suppliers", label: "Suppliers", icon: Building2 },
  { to: "/admin", label: "Admin workspace", icon: LayoutDashboard, adminOnly: true }
];
const money = (n = 0) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(n || 0));
const date = (v: string) => v ? new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
const dateTime = (v: string) => v ? new Date(v).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

function App() {
  const [token, setToken] = useState(getToken());
  const [user, setUser] = useState<AnyRecord | null>(() => {
    try { return JSON.parse(localStorage.getItem("travelcrm_user") || "null"); } catch { return null; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const workspaceMenuRef = useRef<HTMLDivElement>(null);
  const workspaceToggleRef = useRef<HTMLButtonElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileToggleRef = useRef<HTMLButtonElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ name: "", email: "" });
  const [bookingCount, setBookingCount] = useState<number | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [quoteReminders, setQuoteReminders] = useState<AnyRecord[]>([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    if (!workspaceMenuOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!workspaceMenuRef.current?.contains(event.target as Node)) setWorkspaceMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setWorkspaceMenuOpen(false);
        workspaceToggleRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [workspaceMenuOpen]);
  useEffect(() => {
    if (!profileOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) setProfileOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
        profileToggleRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [profileOpen]);
  useEffect(() => {
    if (!token) {
      setQuoteReminders([]);
      setNotificationError("");
      return;
    }
    let active = true;
    const refreshQuoteReminders = async () => {
      try {
        const notes = await api<AnyRecord[]>("/quotes");
        const now = Date.now();
        if (active) {
          setQuoteReminders(notes.filter(note => {
            const expiresAt = new Date(note.expiresAt || new Date(note.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000).getTime();
            return expiresAt > now && expiresAt - now <= 24 * 60 * 60 * 1000;
          }));
          setNotificationError("");
        }
      } catch (error) {
        if (active) setNotificationError(error instanceof Error ? error.message : "Could not load notifications.");
      }
    };
    refreshQuoteReminders();
    const interval = window.setInterval(refreshQuoteReminders, 60 * 1000);
    return () => { active = false; window.clearInterval(interval); };
  }, [token]);
  const signOut = () => {
    localStorage.removeItem("travelcrm_token");
    localStorage.removeItem("travelcrm_user");
    setToken("");
    setUser(null);
    setProfileOpen(false);
    setProfileEditing(false);
    setBookingCount(null);
    navigate("/login");
  };
  useEffect(() => {
    if (!profileOpen) return;
    let cancelled = false;
    setBookingCount(null);
    setProfileError("");
    setProfileLoading(true);
    api<{ bookings: number }>("/dashboard")
      .then(data => { if (!cancelled) setBookingCount(data.bookings); })
      .catch((error: Error) => { if (!cancelled) setProfileError(error.message); })
      .finally(() => { if (!cancelled) setProfileLoading(false); });
    return () => { cancelled = true; };
  }, [profileOpen]);
  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileError("");
    setProfileSaving(true);
    try {
      const updatedUser = await api<AnyRecord>("/users/me", {
        method: "PATCH",
        body: JSON.stringify(profileDraft)
      });
      localStorage.setItem("travelcrm_user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setProfileEditing(false);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Could not update profile");
    } finally {
      setProfileSaving(false);
    }
  };
  const startProfileEdit = () => {
    setProfileDraft({ name: user?.name || "", email: user?.email || "" });
    setProfileError("");
    setProfileEditing(true);
  };
  if (!token) return <Auth onAuth={(t, u) => { localStorage.setItem("travelcrm_token", t); localStorage.setItem("travelcrm_user", JSON.stringify(u)); setToken(t); setUser(u); navigate("/"); }} />;
  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
      <div className="brand"><div className="brand-icon"><Plane size={21}/></div><div><b>TravelCRM</b><small>AI WORKSPACE</small></div><button className="mobile-close" onClick={() => setMobileOpen(false)}><X size={18}/></button></div>
      <div className="workspace-menu-wrap" ref={workspaceMenuRef}>
        <button ref={workspaceToggleRef} className="workspace" type="button" aria-expanded={workspaceMenuOpen} aria-controls="workspace-quick-links" onClick={() => setWorkspaceMenuOpen(open => !open)}>
          <div className="workspace-avatar">T</div><div className="workspace-copy"><b>Travel Studio</b><small>Agency workspace</small></div><ChevronDown className={`workspace-chevron ${workspaceMenuOpen ? "is-open" : ""}`} size={16}/>
        </button>
        <div className="workspace-dropdown" id="workspace-quick-links" hidden={!workspaceMenuOpen}>
          <div className="dropdown-heading"><span>QUICK ACCESS</span><b>Travel Studio</b></div>
          <NavLink to="/bookings" onClick={() => { setWorkspaceMenuOpen(false); setMobileOpen(false); }} className="workspace-menu-link"><Ticket size={16}/><span>Flight bookings</span><ChevronRight size={14}/></NavLink>
          <NavLink to="/leads" onClick={() => { setWorkspaceMenuOpen(false); setMobileOpen(false); }} className="workspace-menu-link"><TrendingUp size={16}/><span>Sales pipeline</span><ChevronRight size={14}/></NavLink>
          <NavLink to="/flight-search" onClick={() => { setWorkspaceMenuOpen(false); setMobileOpen(false); }} className="workspace-menu-link"><Plane size={16}/><span>Flight search</span><ChevronRight size={14}/></NavLink>
        </div>
      </div>
      <div className="nav-label">WORKSPACE</div>
      <nav>{nav.filter(item => !item.adminOnly || user?.role === "admin").map(item => <NavLink key={item.to} to={item.to} end={item.to === "/"} onClick={() => setMobileOpen(false)} className={({isActive}) => `nav-item ${isActive ? "active" : ""}`}><item.icon size={18}/><span>{item.label}</span>{item.to === "/leads" && <span className="nav-count">4</span>}</NavLink>)}</nav>
      <div className="nav-label tools-label">INTELLIGENCE</div>
      <NavLink to="/assistant" onClick={() => setMobileOpen(false)} className={({isActive}) => `nav-item ${isActive ? "active" : ""}`}><Sparkles size={18}/><span>AI Sales Copilot</span><span className="ai-dot"/></NavLink>
      <div className="sidebar-bottom"><div className="upgrade-card"><div className="upgrade-icon"><Sparkles size={17}/></div><b>Work smarter with AI</b><p>Turn travel inquiries into confident next steps.</p><button onClick={() => navigate("/assistant")}>Open AI copilot <ArrowUpRight size={14}/></button></div></div>
    </aside>
    {mobileOpen && <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />}
    <main className="main-area">
      <header className="topbar">
        <button className="mobile-menu icon-button" onClick={() => setMobileOpen(true)}><Menu size={20}/></button>
        <div className="breadcrumb">Workspace <ChevronRight size={14}/> <b>Travel operations</b></div>
        <div className="top-actions">
          <div className="top-date"><CalendarDays size={15}/>{new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</div>
          <div className="notification-wrap">
            <button className="notification icon-button" title="Notifications" aria-expanded={notificationOpen} onClick={() => setNotificationOpen(open => !open)}><Bell size={18}/>{quoteReminders.length > 0 && <span className="notification-count">{quoteReminders.length}</span>}</button>
            {notificationOpen && <div className="notification-popover" role="dialog" aria-label="Notifications">
              <div className="notification-heading"><b>Notifications</b><span>{quoteReminders.length}</span></div>
              {notificationError && <p className="notification-error">{notificationError}</p>}
              {quoteReminders.map(note => <button className="notification-item" key={note._id} onClick={() => { setNotificationOpen(false); navigate("/quotes"); }}>
                <b>{note.title || note.customerName || "Booking note"} expires soon</b>
                <span>Saved note will be deleted on {date(note.expiresAt || new Date(new Date(note.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString())}.</span>
              </button>)}
              {!quoteReminders.length && !notificationError && <p className="notification-empty">No notes are due to expire in the next 24 hours.</p>}
            </div>}
          </div>
          <div className="top-profile" ref={profileMenuRef}>
            <button ref={profileToggleRef} className="top-profile-trigger" type="button" aria-expanded={profileOpen} aria-haspopup="dialog" onClick={() => setProfileOpen(open => !open)}>
              <span className="top-avatar">{(user?.name || "A").slice(0,1).toUpperCase()}</span>
              <span className="top-profile-copy"><b>{user?.name || "Travel Agent"}</b><small>My profile</small></span>
              <ChevronDown size={15} className={profileOpen ? "top-profile-chevron is-open" : "top-profile-chevron"}/>
            </button>
            {profileOpen && <div className="profile-popover top-profile-popover" role="dialog" aria-label="User profile">
              <div className="glass-profile-card">
                <div className="glass-profile-heading">
                  <div className="glass-profile-avatar">{(user?.name || "A").slice(0,1).toUpperCase()}</div>
                  <div className="glass-profile-identity"><b>{user?.name || "Travel Agent"}</b><span>{user?.email || "agent@travelcrm.ai"}</span></div>
                  <span className="glass-profile-status" aria-label="Signed in"/>
                </div>
                <div className="glass-profile-bookings"><Ticket size={17}/><span>Total bookings</span><b>{profileLoading ? "…" : bookingCount ?? "—"}</b></div>
                {profileEditing ? <form className="profile-edit-form" onSubmit={saveProfile}>
                  <label>Full name<input required minLength={2} maxLength={80} value={profileDraft.name} onChange={event => setProfileDraft(draft => ({ ...draft, name: event.target.value }))}/></label>
                  <label>Email address<input required type="email" maxLength={254} value={profileDraft.email} onChange={event => setProfileDraft(draft => ({ ...draft, email: event.target.value }))}/></label>
                  <div className="profile-card-actions">
                    <button className="glass-profile-action glass-profile-save" type="submit" disabled={profileSaving}><Save size={14}/>{profileSaving ? "Saving..." : "Save profile"}</button>
                    <button className="glass-profile-action" type="button" onClick={() => { setProfileEditing(false); setProfileError(""); }}>Cancel</button>
                  </div>
                </form> : <div className="profile-card-actions">
                  <button className="glass-profile-action" type="button" onClick={startProfileEdit}><Pencil size={14}/>Edit profile</button>
                  <button className="glass-profile-action" type="button" onClick={signOut}><UserRoundPlus size={14}/>Switch account</button>
                  <button className="glass-profile-action glass-profile-logout" type="button" onClick={signOut}><LogOut size={14}/>Log out</button>
                </div>}
                {profileError && <p className="profile-error" role="alert">{profileError}</p>}
              </div>
            </div>}
          </div>
        </div>
      </header>
      <div className="page-wrap"><Routes>
        <Route path="/" element={<Dashboard onNavigate={navigate}/>} />
        <Route path="/leads" element={<ResourcePage kind="leads" title="Leads" subtitle="Capture demand, qualify travelers, and keep every opportunity moving." />} />
        <Route path="/customers" element={<ResourcePage kind="customers" title="Customers" subtitle="A shared home for traveler profiles, preferences, and trip history." />} />
        <Route path="/trips" element={<ResourcePage kind="trips" title="Trips & itineraries" subtitle="Plan memorable journeys and keep trip details connected." />} />
        <Route path="/quotes" element={<QuoteNotes />} />
        <Route path="/bookings" element={<BookingDesk agentName={user?.name || "Travel Agent"} />} />
        <Route path="/admin" element={user?.role === "admin" ? <AdminWorkspace /> : <Navigate to="/" replace />} />
        <Route path="/passengers" element={<ResourcePage kind="passengers" title="Passenger profiles" subtitle="Store traveler contact details, preferences, and limited passport metadata." />} />
        <Route path="/flight-search" element={<FlightSearch />} />
        <Route path="/tasks" element={<ResourcePage kind="tasks" title="Tasks & follow-ups" subtitle="Make sure every traveler gets the right attention at the right time." />} />
        <Route path="/suppliers" element={<ResourcePage kind="suppliers" title="Supplier directory" subtitle="Keep hotel, transport, activity, and destination partners organized." />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
      </Routes></div>
    </main>
  </div>;
}

function Auth({ onAuth }: { onAuth: (token: string, user: AnyRecord) => void }) {
  const [mode, setMode] = useState<"login"|"register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { const data = await api<{token:string;user:AnyRecord}>(`/auth/${mode}`, { method:"POST", body:JSON.stringify({name,email,password}) }); onAuth(data.token,data.user); }
    catch (err:any) { setError(err.message || "Could not authenticate"); } finally { setBusy(false); }
  }
  return <div className="auth-layout">
    <section className="auth-visual">
      <div className="auth-brand"><div className="brand-icon"><Plane size={22}/></div><b>TravelCRM <span>AI</span></b></div>
      <div className="auth-hero">
        <span className="auth-kicker"><Sparkles size={14}/> YOUR TRAVEL BUSINESS, IN SYNC</span>
        <h1>Make room for <em>more memorable journeys.</em></h1>
        <p>Bring leads, traveler details, bookings, and follow-ups together in one clear workspace, so your team can focus on the people behind every trip.</p>
        <div className="auth-route-card" aria-label="Sample flight route from New York to Paris">
          <div className="auth-route-heading"><span>THE JOURNEY AT A GLANCE</span><span className="auth-route-status"><i/> READY FOR TAKEOFF</span></div>
          <div className="auth-route">
            <div><small>FROM</small><b>JFK</b><span>New York</span></div>
            <div className="auth-route-line"><span/><Plane size={17}/><span/></div>
            <div><small>TO</small><b>CDG</b><span>Paris</span></div>
          </div>
          <div className="auth-route-footer"><span>One connected workspace</span><span>Every detail in reach <ArrowUpRight size={13}/></span></div>
        </div>
        <div className="auth-benefits"><span><i/> Traveler profiles</span><span><i/> Flight bookings</span><span><i/> Timely follow-ups</span></div>
      </div>
      <div className="auth-foot">Thoughtful tools for the people who make travel happen.</div>
      <div className="auth-flight" aria-hidden="true"><Plane size={24}/></div>
    </section>
    <section className="auth-form-side">
      <form className="auth-form" onSubmit={submit}>
        <div className="auth-form-top"><div className="form-mark"><Plane size={21}/></div><span>TRAVELCRM WORKSPACE</span></div>
        <h2>{mode === "login" ? "Welcome back" : "Start your next chapter"}</h2>
        <p className="muted">{mode === "login" ? "Sign in to pick up where your travelers left off." : "Create an account to bring your travel work together."}</p>
        <div className="auth-mode-switch" role="group" aria-label="Choose sign-in or registration">
          <button type="button" className={mode === "login" ? "selected" : ""} aria-pressed={mode === "login"} onClick={()=>{setMode("login");setError("");}}>Sign in</button>
          <button type="button" className={mode === "register" ? "selected" : ""} aria-pressed={mode === "register"} onClick={()=>{setMode("register");setError("");}}>Create account</button>
        </div>
        {mode === "register" && <label>Full name<input required autoComplete="name" minLength={2} maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/></label>}
        <label>Email address<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@agency.com"/></label>
        <label>Password<input required minLength={8} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters"/></label>
        {error && <div className="error-box" role="alert">{error}</div>}
        <button className="primary-button full-button" disabled={busy}>{busy ? "Please wait..." : mode === "login" ? "Sign in to workspace" : "Create account"}<ArrowUpRight size={16}/></button>
        <div className="auth-switch">{mode === "login" ? "New to TravelCRM? " : "Already have an account? "}<button type="button" onClick={()=>{setMode(mode === "login" ? "register":"login");setError("");}}>{mode === "login" ? "Create account":"Sign in"}</button></div>
        <div className="auth-form-trust"><span><i/> Private workspace</span><span>Built for travel teams</span></div>
      </form>
    </section>
  </div>;
}

function Dashboard({ onNavigate }: { onNavigate: (path:string)=>void }) {
  const [data,setData] = useState<AnyRecord|null>(null); const [error,setError] = useState("");
  useEffect(()=>{
    let active=true;
    const load=()=>api("/dashboard").then(result=>{if(active){setData(result);setError("");}}).catch(e=>{if(active)setError(e.message);});
    load();
    const refresh=()=>load();
    const interval=window.setInterval(refresh,30000);
    window.addEventListener("focus",refresh);
    return()=>{active=false;window.clearInterval(interval);window.removeEventListener("focus",refresh);};
  },[]);
  const pipeline = data?.pipeline || [];
  const max = Math.max(1,...pipeline.map((x:any)=>x.count));
  return <div className="page-content">
    <div className="welcome-row"><div><div className="eyebrow dark-eyebrow"><span className="live-dot"/> YOUR BUSINESS AT A GLANCE</div><h1>Good day, traveler-maker <span>✦</span></h1><p className="page-subtitle">Here's what's moving across your travel business today.</p></div><button className="primary-button" onClick={()=>onNavigate("/bookings?new=1")}><Plus size={17}/> New flight booking</button></div>
    {error && <div className="error-box">{error}. Check that the API and MongoDB are running.</div>}
    <div className="stat-grid">
      <Stat icon={UserRoundSearch} label="Active leads" value={data ? Number(data.leads ?? 0) : null} note="Across your pipeline" tone="violet"/>
      <Stat icon={Users} label="Traveler profiles" value={data ? Number(data.customers ?? 0) : null} note="Relationships in one place" tone="blue"/>
      <Stat icon={MapPinned} label="Trips in planning" value={data ? Number(data.trips ?? 0) : null} note="Travel experiences" tone="mint"/>
      <Stat icon={CircleDollarSign} label="Quote pipeline" value={data ? Number(data.quoteValue ?? 0) : null} format="currency" note={<><AnimatedNumber value={data ? Number(data.openTasks ?? 0) : null}/> open follow-ups</>} tone="amber"/>
    </div>
    <div className="dashboard-grid">
      <section className="panel pipeline-panel"><div className="panel-heading"><div><h3>Lead pipeline</h3><p>See where every opportunity stands.</p></div><button className="text-button" onClick={()=>onNavigate("/leads")}>View all <ArrowUpRight size={14}/></button></div><div className="pipeline-bars">{["New","Contacted","Qualified","Itinerary Sent","Quote Sent","Negotiation","Booked","Lost"].map((status)=>{const found=pipeline.find((x:any)=>x.status===status); const count=Number(found?.count ?? 0); return <div className="pipeline-row" key={status}><span>{status}</span><div className="bar-track"><div className={`bar-fill ${status==="Booked"?"bar-green":status==="Lost"?"bar-gray":""}`} style={{width:`${Math.max(count?7:0,(count/max)*100)}%`}}/></div><b><AnimatedNumber value={data ? count : null}/></b></div>})}</div><div className="pipeline-footer"><TrendingUp size={16}/><span>Keep momentum: follow up on every quote within 48 hours.</span></div></section>
      <section className="panel ai-panel"><div className="ai-panel-top"><div className="ai-symbol"><Sparkles size={19}/></div><span className="ai-pill">AI COPILOT</span></div><h3>Your next best actions</h3><p>Small, timely actions can make a big difference to conversion.</p><div className="recommendation"><div className="rec-number">01</div><div><b>Reconnect with warm leads</b><span>Review quote-stage leads and ask what would help them decide.</span></div></div><div className="recommendation"><div className="rec-number">02</div><div><b>Keep trip details current</b><span>Confirm traveler counts, dates, and supplier availability.</span></div></div><button className="ai-cta" onClick={()=>onNavigate("/assistant")}>Open AI Sales Copilot <ArrowUpRight size={15}/></button></section>
      <section className="panel recent-bookings-panel"><div className="panel-heading"><div><h3>Flight bookings</h3><p><AnimatedNumber value={data ? data.recentBookings?.length ?? 0 : null}/> saved bookings · Select a card to view or edit all details.</p></div><button className="text-button" onClick={()=>onNavigate("/bookings")}>Manage bookings <ArrowUpRight size={14}/></button></div>{data?.recentBookings?.length ? <div className="overview-booking-grid">{data.recentBookings.map((booking:AnyRecord)=><article className="overview-booking-card" key={booking._id} role="button" tabIndex={0} onClick={()=>onNavigate(`/bookings?edit=${encodeURIComponent(booking._id)}`)} onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();onNavigate(`/bookings?edit=${encodeURIComponent(booking._id)}`);}}}>
        <div className="overview-booking-top"><div><b>{booking.bookingReference}</b><small>Saved {dateTime(booking.createdAt)}</small></div><Status value={booking.status}/></div>
        <div className="overview-booking-route"><span>{booking.origin}</span><Plane size={15}/><span>{booking.destination}</span></div>
        <div className="overview-booking-info"><div><small>Passenger</small><b>{booking.customerName}</b></div><div><small>Flight</small><b>{booking.airline} {booking.flightNumber || ""}</b></div><div><small>Departure</small><b>{dateTime(booking.departureAt)}</b></div><div><small>Payment</small><b>{booking.paymentMethod || "Not selected"} · {booking.paymentStatus || "Unpaid"}</b></div></div>
        <span className="overview-booking-open">Click to edit booking details</span>
      </article>)}</div> : data && <div className="empty booking-empty">No flight bookings yet. Create your first booking to see it here.<button className="secondary-button" onClick={()=>onNavigate("/bookings?new=1")}><Plus size={14}/> New flight booking</button></div>}</section>
    </div>
    <div className="footer-note">TravelCRM AI <span>•</span> A more thoughtful way to manage every journey.</div>
  </div>;
}
function Stat({icon:Icon,label,value,note,tone,format="number"}:{icon:any;label:string;value:number|null;note:React.ReactNode;tone:string;format?:"number"|"currency"}) { return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={19}/></div><span className="stat-label">{label}</span><b className="stat-value"><AnimatedNumber value={value} format={format}/></b><small>{note}</small></div>; }
function AnimatedNumber({value,format="number"}:{value:number|null;format?:"number"|"currency"}) {
  const [displayValue,setDisplayValue]=useState(0);
  useEffect(()=>{
    if(value===null||!Number.isFinite(value))return;
    if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){setDisplayValue(value);return;}
    let frame=0;
    const duration=1000;
    const start=performance.now();
    setDisplayValue(0);
    const tick=(now:number)=>{
      const progress=Math.min((now-start)/duration,1);
      setDisplayValue(Math.round(value*(1-Math.pow(1-progress,3))));
      if(progress<1)frame=window.requestAnimationFrame(tick);
    };
    frame=window.requestAnimationFrame(tick);
    return()=>window.cancelAnimationFrame(frame);
  },[value]);
  if(value===null||!Number.isFinite(value))return <>—</>;
  return <span aria-live="off">{format==="currency"?money(displayValue):new Intl.NumberFormat("en-IN").format(displayValue)}</span>;
}
function Status({value}:{value:string}) { const cls=(value||"new").toLowerCase().replace(/ /g,"-"); return <span className={`status status-${cls}`}>{value}</span>; }

const bookingFields = [
  {key:"bookingReference",label:"Booking reference / PNR",required:true},
  {key:"gdsConfirmation",label:"GDS confirmation"},
  {key:"customerName",label:"Passenger / customer name",required:true},
  {key:"customerEmail",label:"Customer email",type:"email"},
  {key:"customerPhone",label:"Customer phone"},
  {key:"airline",label:"Airline",required:true},
  {key:"flightNumber",label:"Flight number",required:true},
  {key:"origin",label:"Origin airport (IATA)",required:true},
  {key:"destination",label:"Destination airport (IATA)",required:true},
  {key:"departureAt",label:"Departure date & time",type:"datetime-local",required:true},
  {key:"arrivalAt",label:"Arrival date & time",type:"datetime-local"},
  {key:"tripType",label:"Trip type",type:"select",options:["One-way","Round-trip","Multi-city"]},
  {key:"passengers",label:"Passenger count",type:"number",required:true},
  {key:"baseFare",label:"Base fare",type:"number"},
  {key:"airlineFees",label:"Airline fees",type:"number"},
  {key:"currency",label:"Currency",type:"select",options:["USD","INR","EUR","GBP"]},
  {key:"markup",label:"Markup",type:"number"},
  {key:"assignedAgentName",label:"Assigned agent"},
  {key:"seatSelections",label:"Seat selections"},
  {key:"baggage",label:"Baggage"},
  {key:"status",label:"Booking status",type:"select",options:["Pending Verification","Payment Pending","Ticketed","Cancelled","Refund Pending","Refunded","Reissued"]},
  {key:"paymentStatus",label:"Payment status",type:"select",options:["Unpaid","Checkout Created","Paid","Failed","Refunded"]},
  {key:"paymentMethod",label:"Payment method",type:"select",options:["","Credit card","Debit card","Bank transfer"]},
  {key:"notes",label:"Notes",type:"textarea"}
];
const paymentMethods = ["Credit card","Debit card","Bank transfer"];
const paymentTotal = (booking:AnyRecord) => Number(booking.baseFare || 0) + Number(booking.airlineFees || 0) + Number(booking.markup || 0);
const bookingMoney = (booking:AnyRecord) => new Intl.NumberFormat("en-IN",{style:"currency",currency:booking.currency || "INR",maximumFractionDigits:0}).format(paymentTotal(booking));
const localDateTime = (value:string) => value ? new Date(value).toISOString().slice(0,16) : "";
const paymentReferenceNote = "Enter the full card number if needed. Only its last four digits and expiry are saved; the full number and CVV are not stored.";
const safePaymentInfo = (info:AnyRecord) => {
  const { cardCvv: _cardCvv, ...safeInfo } = info;
  const cardLastFour = String(safeInfo.cardLastFour || "").replace(/\D/g, "");
  const cardCvv = String(safeInfo.cardCvv || "");
  safeInfo.cardLastFour = cardLastFour.slice(-4);
  return safeInfo;
};

function BookingDesk({agentName}:{agentName:string}) {
  const [items,setItems] = useState<AnyRecord[]>([]);
  const [search,setSearch] = useState("");
  const [form,setForm] = useState<AnyRecord>({});
  const [editingId,setEditingId] = useState("");
  const [editorOpen,setEditorOpen] = useState(false);
  const [paymentDialog,setPaymentDialog] = useState(false);
  const [paymentTarget,setPaymentTarget] = useState<AnyRecord|null>(null);
  const [paymentChoice,setPaymentChoice] = useState("");
  const [paymentInfo,setPaymentInfo] = useState<AnyRecord>({});
  const [cardNumberInput,setCardNumberInput] = useState("");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const listRequest = useRef(0);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (paymentDialog) setCardNumberInput(String(paymentInfo.cardLastFour || ""));
  }, [paymentDialog]);

  async function load(query=search) {
    const requestId = ++listRequest.current;
    try {
      const bookings = await api<AnyRecord[]>(`/bookings?search=${encodeURIComponent(query)}`);
      if (requestId === listRequest.current) {
        setItems(bookings);
        setError("");
      }
    } catch (e) {
      if (requestId === listRequest.current) setError(e instanceof Error ? e.message : "Could not load bookings.");
    }
  }
  useEffect(() => {
    void load();
    return () => { listRequest.current++; };
  }, [search]);
  useEffect(() => {
    if (new URLSearchParams(location.search).get("new") === "1") {
      setEditingId("");
      setForm({currency:"USD",passengers:1,assignedAgentName:agentName});
      setEditorOpen(true);
      navigate("/bookings",{replace:true});
      return;
    }
    const bookingId=new URLSearchParams(location.search).get("edit");
    if (!bookingId || !items.length) return;
    const booking=items.find(item=>item._id===bookingId);
    if (!booking) {
      setError("The requested booking was not found in your booking list.");
      navigate("/bookings",{replace:true});
      return;
    }
    startEdit(booking);
    navigate("/bookings",{replace:true});
  },[location.search,navigate,agentName,items]);

  function startCreate() {
    setEditingId("");
    setForm({currency:"USD",passengers:1,assignedAgentName:agentName});
    setError("");
    setEditorOpen(true);
  }
  function startEdit(booking:AnyRecord) {
    const initial = safePaymentInfo(booking);
    for (const key of ["departureAt","arrivalAt"]) initial[key] = localDateTime(booking[key] || "");
    setEditingId(booking._id);
    setForm(initial);
    setError("");
    setEditorOpen(true);
  }
  function updateField(key:string,type:string|undefined,value:string) {
    const upper = ["bookingReference","flightNumber","origin","destination"].includes(key);
    const next = type === "number" ? Number(value) : upper ? value.toUpperCase() : value;
    setForm(current => ({...current,[key]:next}));
    if (key === "paymentMethod" && value) {
      setPaymentChoice(value);
      setPaymentTarget(editingId ? form : null);
      setPaymentInfo(safePaymentInfo(form));
      setPaymentDialog(true);
    }
  }
  async function persistBooking() {
    const origin = String(form.origin || "").trim().toUpperCase();
    const destination = String(form.destination || "").trim().toUpperCase();
    const departureAt = form.departureAt ? new Date(form.departureAt) : null;
    const arrivalAt = form.arrivalAt ? new Date(form.arrivalAt) : null;
    if (String(form.bookingReference || "").trim().length < 4) {
      setError("Booking reference must contain at least 4 characters.");
      return;
    }
    if (String(form.customerName || "").trim().length < 2) {
      setError("Passenger / customer name must contain at least 2 characters.");
      return;
    }
    if (String(form.airline || "").trim().length < 2) {
      setError("Airline must contain at least 2 characters.");
      return;
    }
    if (origin && destination && origin === destination) {
      setError("Origin and destination must be different airports.");
      return;
    }
    if (arrivalAt && departureAt && arrivalAt < departureAt) {
      setError("Arrival must be after departure.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const saved = await api<AnyRecord>(editingId ? `/bookings/${editingId}` : "/bookings",{
        method:editingId ? "PATCH" : "POST",
        body:JSON.stringify({...safePaymentInfo(form),assignedAgentName:agentName})
      });
      setItems(current=>[saved,...current.filter(item=>item._id!==saved._id)]);
      setEditorOpen(false);
      if (!editingId) {
        setSearch("");
      } else {
        void load();
      }
      setEditingId("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save booking.");
    } finally { setBusy(false); }
  }
  async function confirmPayment() {
    if (!paymentChoice) return;
    setBusy(true);
    setError("");
    try {
      if (paymentTarget) {
        await api<AnyRecord>(`/bookings/${paymentTarget._id}`,{
          method:"PATCH",body:JSON.stringify({...safePaymentInfo(paymentInfo),paymentMethod:paymentChoice})
        });
        await load();
      }
      const safeInfo = safePaymentInfo(paymentInfo);
      setPaymentInfo(safeInfo);
      setForm(current=>({...current,...safeInfo,paymentMethod:paymentChoice}));
      setPaymentDialog(false);
      setPaymentTarget(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save payment information.");
    } finally { setBusy(false); }
  }
  async function remove(booking:AnyRecord) {
    if (!confirm(`Delete booking ${booking.bookingReference}?`)) return;
    try { await api(`/bookings/${booking._id}`,{method:"DELETE"}); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not delete booking."); }
  }

  return <div className="page-content">
    <div className="welcome-row"><div><div className="eyebrow dark-eyebrow"><span className="live-dot"/>BOOKING MANAGEMENT</div><h1>Flight bookings</h1><p className="page-subtitle">Each booking is saved as an editable card, identified by its unique booking reference.</p></div><button className="primary-button" onClick={startCreate}><Plus size={17}/> Add booking</button></div>
    {error && <div className="error-box" role="alert">{error}</div>}
    <div className="booking-toolbar"><div className="search-box"><Search size={17}/><input placeholder="Search bookings or PNR..." value={search} onChange={event=>setSearch(event.target.value)}/></div><span className="result-count">{items.length} bookings</span></div>
    <div className="booking-card-grid">{items.map(booking=><article key={booking._id} className="booking-card" role="button" tabIndex={0} onClick={()=>startEdit(booking)} onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();startEdit(booking);}}}>
      <div className="booking-card-heading"><div><span className="booking-reference">{booking.bookingReference}</span><small>Created {dateTime(booking.createdAt)}</small></div><Status value={booking.status}/></div>
      <div className="booking-card-route"><div><small>FROM</small><b>{booking.origin}</b></div><Plane size={18}/><div><small>TO</small><b>{booking.destination}</b></div></div>
      <div className="booking-card-details">
        <div><small>Passenger</small><b>{booking.customerName}</b></div><div><small>Flight</small><b>{booking.airline} {booking.flightNumber}</b></div>
        <div><small>Departure</small><b>{dateTime(booking.departureAt)}</b></div><div><small>Assigned agent</small><b>{booking.assignedAgentName || agentName}</b></div>
        <div><small>Payment</small><b>{booking.paymentMethod || "Not selected"} · {booking.paymentStatus || "Unpaid"}</b></div>
        <div><small>Fare total</small><b>{bookingMoney(booking)}</b></div>
      </div>
      {(booking.cardholderName || booking.cardLastFour || booking.cardCvv || booking.bankAccountHolder || booking.bankName || booking.bankIfsc || booking.bankTransferReference || booking.billingAddress || booking.billingCity || booking.billingRegion || booking.billingPostalCode || booking.billingCountry) && <div className="booking-payment-details">
        <b>Saved payment reference</b>
        {booking.cardholderName && <span>Cardholder: {booking.cardholderName}</span>}
        {booking.cardCvv && <span>CVV: {booking.cardCvv}</span>}
        {booking.cardLastFour && <span>Card ending in {booking.cardLastFour}{booking.cardExpiryMonth && booking.cardExpiryYear ? ` · Exp ${booking.cardExpiryMonth}/${booking.cardExpiryYear}` : ""}</span>}
        {booking.bankAccountHolder && <span>Account holder: {booking.bankAccountHolder}</span>}
        {booking.bankName && <span>Bank: {booking.bankName}</span>}
        {booking.bankIfsc && <span>IFSC: {booking.bankIfsc}</span>}
        {booking.bankTransferReference && <span>Transfer ref: {booking.bankTransferReference}</span>}
        {booking.billingAddress && <span>Billing: {[booking.billingAddress,booking.billingCity,booking.billingRegion,booking.billingPostalCode,booking.billingCountry].filter(Boolean).join(", ")}</span>}
      </div>}
      <div className="booking-card-actions"><span>Open booking to edit</span>{booking.paymentMethod && <span className="paid-label">{booking.paymentMethod}</span>}<button className="delete-button" onClick={event=>{event.stopPropagation();remove(booking);}}>Delete</button></div>
    </article>)}{!items.length && <div className="booking-empty panel">{search ? "No bookings match your search." : "No bookings yet. Add your first booking to create an editable booking card."}</div>}</div>
    {editorOpen && <div className="modal-backdrop" onClick={()=>setEditorOpen(false)}><form className="modal-card booking-editor" onSubmit={event=>{event.preventDefault();persistBooking();}} onClick={event=>event.stopPropagation()}>
      <div className="modal-heading"><div><h2>{editingId ? `Edit booking ${form.bookingReference || ""}` : "Add flight booking"}</h2><p>Booking reference must be unique. Agent name is filled from your signed-in account.</p></div><button type="button" className="icon-button" onClick={()=>setEditorOpen(false)}><X size={19}/></button></div>
      <div className="form-grid">{bookingFields.map(field=><label key={field.key} className={field.type==="textarea"?"wide-field":""}>{field.label}{field.required?" *":""}
        {field.key==="assignedAgentName" ? <input value={agentName} readOnly/> : field.type==="select" ? <select required={field.required} value={form[field.key] ?? field.options?.[0] ?? ""} onChange={event=>updateField(field.key,field.type,event.target.value)}>{field.options?.map(option=><option key={option} value={option}>{option || "Choose a method"}</option>)}</select> : field.type==="textarea" ? <textarea rows={3} value={form[field.key] || ""} onChange={event=>updateField(field.key,field.type,event.target.value)}/> : <input required={field.required} type={field.type || "text"} min={field.type==="number"?(field.key==="passengers"?1:0):undefined} max={field.key==="passengers"?9:undefined} minLength={field.key==="bookingReference"?4:field.key==="customerName"||field.key==="airline"?2:field.key==="origin"||field.key==="destination"?3:undefined} maxLength={field.key==="bookingReference"?20:field.key==="origin"||field.key==="destination"?3:field.key==="customerName"?160:field.key==="airline"?100:undefined} pattern={field.key==="bookingReference"?"[A-Za-z0-9-]+":field.key==="origin"||field.key==="destination"?"[A-Za-z]{3}":undefined} value={form[field.key] ?? ""} onChange={event=>updateField(field.key,field.type,event.target.value)}/>}
        {field.key==="paymentMethod" && form.paymentMethod && <button type="button" className="payment-edit-button" onClick={()=>{setPaymentChoice(form.paymentMethod);setPaymentInfo(safePaymentInfo(form));setPaymentTarget(editingId ? form : null);setPaymentDialog(true);}}>Edit saved payment details</button>}
      </label>)}</div>
      <div className="secure-payment-note"><CreditCard size={15}/>{paymentReferenceNote}</div>
      {error && <div className="error-box" role="alert">{error}</div>}
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setEditorOpen(false)}>Cancel</button><button className="primary-button" disabled={busy}>{busy?"Saving...":"Save booking"}</button></div>
    </form></div>}
    {paymentDialog && <div className="modal-backdrop payment-backdrop" onClick={()=>{setPaymentDialog(false);setPaymentTarget(null);}}><div className="modal-card payment-dialog" role="dialog" aria-modal="true" aria-labelledby="payment-title" onClick={event=>event.stopPropagation()}>
      <div className="modal-heading"><div><h2 id="payment-title">{paymentChoice} information</h2><p>Saved with this booking for reference only. No payment is processed.</p></div><button type="button" className="icon-button" onClick={()=>{setPaymentDialog(false);setPaymentTarget(null);}}><X size={19}/></button></div>
      {paymentChoice !== "Bank transfer" ? <>
        <label>Cardholder name<input autoComplete="cc-name" maxLength={120} value={paymentInfo.cardholderName || ""} onChange={event=>setPaymentInfo(current=>({...current,cardholderName:event.target.value}))}/></label>
        <label>Card Number <input inputMode="numeric" autoComplete="cc-number" maxLength={16} value={cardNumberInput} onChange={event=>{const number=event.target.value.replace(/\D/g,"").slice(0,16);setCardNumberInput(number);setPaymentInfo(current=>({...current,cardLastFour:number.slice(-4)}));}} placeholder="Enter card number"/></label>
        <label>Card CVV <input inputMode="numeric" autoComplete="off" maxLength={3} pattern="[0-9]{0,3}" value={paymentInfo.cardCvv || ""} onChange={event=>setPaymentInfo(current=>({...current,cardCvv:event.target.value.replace(/\D/g,"").slice(0,3)}))} placeholder="123"/></label>

        <div className="payment-expiry-grid"><label>Expiry month<input inputMode="numeric" maxLength={2} value={paymentInfo.cardExpiryMonth || ""} onChange={event=>setPaymentInfo(current=>({...current,cardExpiryMonth:event.target.value.replace(/\D/g,"").slice(0,2)}))} placeholder="MM"/></label><label>Expiry year<input inputMode="numeric" maxLength={4} value={paymentInfo.cardExpiryYear || ""} onChange={event=>setPaymentInfo(current=>({...current,cardExpiryYear:event.target.value.replace(/\D/g,"").slice(0,4)}))} placeholder="YYYY"/></label></div>
      </> : <>
        <label>Account holder name<input maxLength={120} value={paymentInfo.bankAccountHolder || ""} onChange={event=>setPaymentInfo(current=>({...current,bankAccountHolder:event.target.value}))}/></label>
        <label>Bank name<input maxLength={120} value={paymentInfo.bankName || ""} onChange={event=>setPaymentInfo(current=>({...current,bankName:event.target.value}))}/></label>
        <label>IFSC / bank routing code<input maxLength={20} autoComplete="off" value={paymentInfo.bankIfsc || ""} onChange={event=>setPaymentInfo(current=>({...current,bankIfsc:event.target.value.toUpperCase()}))}/></label>
        <label>Transfer reference<input maxLength={80} value={paymentInfo.bankTransferReference || ""} onChange={event=>setPaymentInfo(current=>({...current,bankTransferReference:event.target.value}))}/></label>
      </>}
      <div className="payment-address-grid">
        <label>Billing address<input autoComplete="billing address-line1" maxLength={180} value={paymentInfo.billingAddress || ""} onChange={event=>setPaymentInfo(current=>({...current,billingAddress:event.target.value}))}/></label>
        <label>City<input autoComplete="billing address-level2" maxLength={80} value={paymentInfo.billingCity || ""} onChange={event=>setPaymentInfo(current=>({...current,billingCity:event.target.value}))}/></label>
        <label>State / region<input autoComplete="billing address-level1" maxLength={80} value={paymentInfo.billingRegion || ""} onChange={event=>setPaymentInfo(current=>({...current,billingRegion:event.target.value}))}/></label>
        <label>Postal code<input autoComplete="billing postal-code" maxLength={20} value={paymentInfo.billingPostalCode || ""} onChange={event=>setPaymentInfo(current=>({...current,billingPostalCode:event.target.value}))}/></label>
        <label>Country<input autoComplete="billing country-name" maxLength={80} value={paymentInfo.billingCountry || ""} onChange={event=>setPaymentInfo(current=>({...current,billingCountry:event.target.value}))}/></label>
      </div>
      <div className="secure-payment-note"><CreditCard size={15}/>{paymentReferenceNote}</div>
      {error && <div className="error-box" role="alert">{error}</div>}
      <div className="modal-actions"><button className="secondary-button" onClick={()=>{setPaymentDialog(false);setPaymentTarget(null);}}>Cancel</button><button className="primary-button" disabled={busy} onClick={confirmPayment}>{busy?"Saving...":"Save payment information"}</button></div>
    </div></div>}
  </div>;
}

function QuoteNotes() {
  const [items,setItems] = useState<AnyRecord[]>([]);
  const [search,setSearch] = useState("");
  const [editorOpen,setEditorOpen] = useState(false);
  const [editing,setEditing] = useState<AnyRecord|null>(null);
  const [title,setTitle] = useState("");
  const [notes,setNotes] = useState("");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  async function load() {
    try { setItems(await api(`/quotes?search=${encodeURIComponent(search)}`)); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load saved notes."); }
  }
  useEffect(()=>{load();},[search]);
  function newNote() { setEditing(null); setTitle(""); setNotes(""); setError(""); setEditorOpen(true); }
  function editNote(item:AnyRecord) { setEditing(item); setTitle(item.title || item.customerName || "Booking note"); setNotes(item.notes || ""); setError(""); setEditorOpen(true); }
  async function saveNote(event:React.FormEvent) {
    event.preventDefault();setBusy(true);setError("");
    try {
      const payload={title:title.trim(),notes};
      await api(editing ? `/quotes/${editing._id}` : "/quotes",{method:editing?"PATCH":"POST",body:JSON.stringify(payload)});
      setEditorOpen(false);setEditing(null);setTitle("");setNotes("");await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save note."); }
    finally { setBusy(false); }
  }
  async function deleteNote(item:AnyRecord) {
    if (!confirm(`Delete "${item.title || "this note"}"?`)) return;
    try { await api(`/quotes/${item._id}`,{method:"DELETE"}); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not delete note."); }
  }
  return <div className="page-content">
    <div className="welcome-row"><div><div className="eyebrow dark-eyebrow"><span className="live-dot"/>AGENT NOTES</div><h1>Quotes & proposals</h1><p className="page-subtitle">A simple notepad for booking details. Notes are automatically deleted seven days after they are created.</p></div><button className="primary-button" onClick={newNote}><Plus size={17}/> New note</button></div>
    {error && <div className="error-box" role="alert">{error}</div>}
    <div className="booking-toolbar"><div className="search-box"><Search size={17}/><input placeholder="Search notes..." value={search} onChange={event=>setSearch(event.target.value)}/></div><span className="result-count">{items.length} notes</span></div>
    <div className="note-card-grid">{items.map(item=><article className="note-card" key={item._id} onClick={()=>editNote(item)}>
      <div className="note-card-heading"><h2>{item.title || item.customerName || "Booking note"}</h2><button className="delete-button" onClick={event=>{event.stopPropagation();deleteNote(item);}}>Delete</button></div>
      <p>{item.notes || "No booking details yet."}</p>
      <small>Saved {dateTime(item.createdAt)} · Expires {date(item.expiresAt || new Date(new Date(item.createdAt).getTime()+7*24*60*60*1000).toISOString())}</small>
    </article>)}{!items.length && <div className="booking-empty panel">{search ? "No notes match your search." : "No notes saved yet. Create a note to keep booking details here for seven days."}</div>}</div>
    {editorOpen && <div className="modal-backdrop" onClick={()=>setEditorOpen(false)}><form className="modal-card note-editor" onSubmit={saveNote} onClick={event=>event.stopPropagation()}>
      <div className="modal-heading"><div><h2>{editing ? "Edit booking note" : "New booking note"}</h2><p>The seven-day deletion period starts when the note is first saved.</p></div><button type="button" className="icon-button" onClick={()=>setEditorOpen(false)}><X size={19}/></button></div>
      <label>Note title<input required maxLength={160} value={title} onChange={event=>setTitle(event.target.value)} placeholder="Traveler or booking name"/></label>
      <label>Booking details<textarea rows={12} maxLength={20000} value={notes} onChange={event=>setNotes(event.target.value)} placeholder="Write booking details, itinerary notes, or proposal information..."/></label>
      {error && <div className="error-box" role="alert">{error}</div>}
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setEditorOpen(false)}>Cancel</button><button className="primary-button" disabled={busy}>{busy?"Saving...":"Save note"}</button></div>
    </form></div>}
  </div>;
}

const adminRecordTypes = [
  ["bookings","Flight bookings"],
  ["leads","Leads"],
  ["customers","Customers"],
  ["trips","Trips"],
  ["quotes","Quotes & notes"],
  ["tasks","Tasks"],
  ["passengers","Passengers"],
  ["suppliers","Suppliers"]
];
const adminValue = (value:unknown) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};
const adminLabel = (key:string) => key.replace(/([A-Z])/g," $1").replace(/^./,letter=>letter.toUpperCase());

function AdminWorkspace() {
  const [kind,setKind] = useState("bookings");
  const [agentId,setAgentId] = useState("");
  const [search,setSearch] = useState("");
  const [page,setPage] = useState(1);
  const [data,setData] = useState<AnyRecord|null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  useEffect(()=>{
    let active=true;
    setLoading(true);
    const query=new URLSearchParams({kind,page:String(page),limit:"50"});
    if(agentId) query.set("agentId",agentId);
    if(search.trim()) query.set("search",search.trim());
    api<AnyRecord>(`/admin/workspace?${query.toString()}`)
      .then(result=>{if(active){setData(result);setError("");}})
      .catch(reason=>{if(active)setError(reason instanceof Error?reason.message:"Could not load admin workspace.");})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[kind,agentId,search,page]);
  function changeKind(value:string) { setKind(value);setPage(1); }
  function changeAgent(value:string) { setAgentId(value);setPage(1); }
  const records:AnyRecord[]=data?.records || [];
  const counts:AnyRecord=data?.counts || {};
  const agents:AnyRecord[]=data?.agents || [];
  const pagination=data?.pagination || {page:1,pages:1,total:0};
  return <div className="page-content admin-workspace">
    <div className="welcome-row"><div><div className="eyebrow dark-eyebrow"><span className="live-dot"/>PRIVATE ADMIN AREA</div><h1>CRM control center</h1><p className="page-subtitle">Agency-wide records across agents. Access is restricted to administrator accounts.</p></div></div>
    {error&&<div className="error-box" role="alert">{error}</div>}
    <div className="admin-count-grid">{adminRecordTypes.map(([key,label])=><button type="button" className={`admin-count-card ${kind===key?"selected":""}`} key={key} onClick={()=>changeKind(key)}><span>{label}</span><b>{counts[key] ?? "—"}</b></button>)}</div>
    <section className="panel admin-record-panel">
      <div className="admin-toolbar"><div><h2>{adminRecordTypes.find(([key])=>key===kind)?.[1] || "CRM records"}</h2><p>{pagination.total} records across all agents</p></div><div className="admin-filters">
        <label>Agent<select value={agentId} onChange={event=>changeAgent(event.target.value)}><option value="">All agents</option>{agents.map(agent=><option key={agent._id} value={agent._id}>{agent.name} · {agent.email}</option>)}</select></label>
        <label>Search<input value={search} onChange={event=>{setSearch(event.target.value);setPage(1);}} placeholder={`Search ${kind}...`}/></label>
      </div></div>
      {kind==="bookings" && <div className="admin-agent-list"><b>Agents</b>{agents.map(agent=><span key={agent._id}>{agent.name} <small>{agent.email}</small></span>)}</div>}
      {loading ? <div className="empty admin-empty">Loading CRM records...</div> : records.length ? <div className="admin-record-list">{records.map(record=>{
        const title=kind==="bookings" ? record.bookingReference : record.title || record.name || record.customerName || [record.firstName,record.lastName].filter(Boolean).join(" ") || record._id;
        const subtitle=kind==="bookings" ? `${record.origin || "—"} → ${record.destination || "—"} · ${record.airline || ""} ${record.flightNumber || ""}` : record.destination || record.email || record.status || "";
        const details=Object.entries(record).filter(([key])=>!["__v","ownerId","ownerName"].includes(key));
        return <article className="admin-record-card" key={record._id}>
          <div className="admin-record-summary"><div><b>{title}</b><span>{subtitle}</span><small>Agent: {record.ownerName} · Created {dateTime(record.createdAt)}</small></div>{kind==="bookings"&&<Status value={record.status || "Pending Verification"}/>}</div>
          {kind==="bookings"&&<div className="admin-booking-highlights"><span><small>Passenger</small><b>{record.customerName || "—"}</b></span><span><small>Departure</small><b>{dateTime(record.departureAt)}</b></span><span><small>Payment</small><b>{record.paymentMethod || "Not selected"} · {record.paymentStatus || "Unpaid"}</b></span><span><small>Fare</small><b>{new Intl.NumberFormat("en-IN",{style:"currency",currency:record.currency || "INR",maximumFractionDigits:0}).format(Number(record.baseFare||0)+Number(record.airlineFees||0)+Number(record.markup||0))}</b></span></div>}
          <details className="admin-record-details"><summary>View all record details</summary><dl>{details.map(([key,value])=><div key={key}><dt>{adminLabel(key)}</dt><dd>{key==="createdAt"||key==="updatedAt"||key==="departureAt"||key==="arrivalAt"||key==="expiresAt"?dateTime(String(value)):adminValue(value)}</dd></div>)}</dl></details>
        </article>;
      })}</div> : <div className="empty admin-empty">{search||agentId?"No records match these filters.":"No records have been created yet."}</div>}
      <div className="admin-pagination"><span>Page {pagination.page} of {Math.max(1,pagination.pages)}</span><div><button className="secondary-button" disabled={page<=1||loading} onClick={()=>setPage(value=>Math.max(1,value-1))}>Previous</button><button className="secondary-button" disabled={page>=pagination.pages||loading} onClick={()=>setPage(value=>value+1)}>Next</button></div></div>
    </section>
  </div>;
}

const config: Record<string,{fields:{key:string;label:string;type?:string;options?:string[]}[];columns:{key:string;label:string}[]}> = {
  leads:{fields:[{key:"name",label:"Traveler name"},{key:"email",label:"Email",type:"email"},{key:"phone",label:"Phone"},{key:"destination",label:"Destination"},{key:"source",label:"Lead source",type:"select",options:["Website","WhatsApp","Email","Phone","Referral","Facebook","Instagram","Other"]},{key:"travelers",label:"Travelers",type:"number"},{key:"budget",label:"Budget (INR)",type:"number"},{key:"departureDate",label:"Departure date",type:"date"},{key:"status",label:"Status",type:"select",options:["New","Contacted","Qualified","Itinerary Sent","Quote Sent","Negotiation","Booked","Lost"]},{key:"priority",label:"Priority",type:"select",options:["Low","Medium","High"]},{key:"notes",label:"Notes",type:"textarea"}],columns:[{key:"name",label:"Traveler"},{key:"destination",label:"Destination"},{key:"source",label:"Source"},{key:"status",label:"Status"},{key:"priority",label:"Priority"},{key:"score",label:"Score"}]},
  passengers:{fields:[{key:"firstName",label:"First name"},{key:"lastName",label:"Last name"},{key:"email",label:"Email",type:"email"},{key:"phone",label:"Phone"},{key:"dateOfBirth",label:"Date of birth",type:"date"},{key:"nationality",label:"Nationality"},{key:"passportLastFour",label:"Passport last 4 characters only"},{key:"passportExpiry",label:"Passport expiry",type:"date"},{key:"frequentFlyerNumber",label:"Frequent flyer number"},{key:"seatPreference",label:"Seat preference",type:"select",options:["No preference","Window","Aisle","Middle"]},{key:"mealPreference",label:"Meal preference"},{key:"notes",label:"Notes (do not add full card/passport numbers)",type:"textarea"}],columns:[{key:"firstName",label:"First name"},{key:"lastName",label:"Last name"},{key:"email",label:"Email"},{key:"phone",label:"Phone"},{key:"nationality",label:"Nationality"},{key:"passportExpiry",label:"Passport expiry"}]},
  customers:{fields:[{key:"firstName",label:"First name"},{key:"lastName",label:"Last name"},{key:"email",label:"Email",type:"email"},{key:"phone",label:"Phone"},{key:"country",label:"Country"},{key:"notes",label:"Notes",type:"textarea"}],columns:[{key:"firstName",label:"First name"},{key:"lastName",label:"Last name"},{key:"email",label:"Email"},{key:"phone",label:"Phone"},{key:"country",label:"Country"}]},
  trips:{fields:[{key:"customerName",label:"Traveler / customer"},{key:"destination",label:"Destination"},{key:"startDate",label:"Start date",type:"date"},{key:"endDate",label:"End date",type:"date"},{key:"travelers",label:"Travelers",type:"number"},{key:"status",label:"Status",type:"select",options:["Planning","Confirmed","In Progress","Completed","Cancelled"]}],columns:[{key:"customerName",label:"Traveler"},{key:"destination",label:"Destination"},{key:"startDate",label:"Start date"},{key:"endDate",label:"End date"},{key:"travelers",label:"Travelers"},{key:"status",label:"Status"}]},
  tasks:{fields:[{key:"title",label:"Task"},{key:"relatedLead",label:"Related traveler / lead"},{key:"dueDate",label:"Due date",type:"date"},{key:"priority",label:"Priority",type:"select",options:["Low","Medium","High"]},{key:"status",label:"Status",type:"select",options:["Open","In Progress","Done"]}],columns:[{key:"title",label:"Task"},{key:"relatedLead",label:"Related lead"},{key:"dueDate",label:"Due date"},{key:"priority",label:"Priority"},{key:"status",label:"Status"}]},
  suppliers:{fields:[{key:"name",label:"Supplier name"},{key:"type",label:"Type",type:"select",options:["Hotel","Transport","Activity","Airline","DMC","Guide","Other"]},{key:"destination",label:"Destination / location"},{key:"email",label:"Email"},{key:"phone",label:"Phone"},{key:"notes",label:"Notes",type:"textarea"}],columns:[{key:"name",label:"Supplier"},{key:"type",label:"Type"},{key:"destination",label:"Destination"},{key:"email",label:"Email"},{key:"phone",label:"Phone"}]}
};

const requiredFields:Record<string,string[]>={leads:["name","destination"],customers:["firstName"],trips:["customerName","destination"],tasks:["title"],suppliers:["name"],passengers:["firstName"]};

function ResourcePage({kind,title,subtitle}:{kind:string;title:string;subtitle:string}) {
  const [items,setItems]=useState<AnyRecord[]>([]); const [search,setSearch]=useState(""); const [modal,setModal]=useState(false); const [busy,setBusy]=useState(false); const [error,setError]=useState(""); const [form,setForm]=useState<AnyRecord>({});
  const location=useLocation(); const navigate=useNavigate();
  const cfg=config[kind];
  useEffect(()=>{if(kind==="bookings"&&new URLSearchParams(location.search).get("new")==="1"){setForm({});setModal(true);navigate("/bookings",{replace:true});}},[kind,location.search,navigate]);
  function updateFormField(key:string,type:string|undefined,value:string){const uppercase=kind==="bookings"&&["bookingReference","flightNumber","origin","destination"].includes(key);setForm(current=>({...current,[key]:type==="number"?Number(value):uppercase?value.toUpperCase():value}));}
  async function load(){try{setItems(await api(`/${kind}?search=${encodeURIComponent(search)}`));setError("");}catch(e:any){setError(e.message);}}
  useEffect(()=>{load();},[kind,search]);
  async function save(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");try{await api(`/${kind}`,{method:"POST",body:JSON.stringify(form)});setModal(false);setForm({});await load();}catch(e:any){setError(e.message);}finally{setBusy(false);}}
  async function updateStatus(item:AnyRecord,key:string,value:string){try{await api(`/${kind}/${item._id}`,{method:"PATCH",body:JSON.stringify({[key]:value})});await load();}catch(e:any){setError(e.message);}}
  async function remove(item:AnyRecord){if(!confirm("Delete this record?"))return;try{await api(`/${kind}/${item._id}`,{method:"DELETE"});await load();}catch(e:any){setError(e.message);}}
  async function scoreLead(item:AnyRecord){try{const result=await api<AnyRecord>("/ai/lead-insights",{method:"POST",body:JSON.stringify(item)});await api(`/leads/${item._id}`,{method:"PATCH",body:JSON.stringify({score:result.score,priority:result.priority})});alert(`AI lead score: ${result.score}/100\nPriority: ${result.priority}\n\n${result.nextAction}\n\nReasons: ${result.reasons.join(", ")}`);await load();}catch(e:any){setError(e.message);}}
  return <div className="page-content"><div className="welcome-row"><div><div className="eyebrow dark-eyebrow"><span className="live-dot"/>{kind.toUpperCase()} MANAGEMENT</div><h1>{title}</h1><p className="page-subtitle">{subtitle}</p></div><button className="primary-button" onClick={()=>{setForm({});setModal(true);}}><Plus size={17}/> Add {kind==="leads"?"lead":kind==="customers"?"customer":kind==="trips"?"trip":kind==="quotes"?"quote":kind==="bookings"?"booking":kind==="passengers"?"passenger":kind==="tasks"?"task":"supplier"}</button></div>
  {error&&<div className="error-box">{error}</div>}<div className="panel resource-panel"><div className="resource-toolbar"><div className="search-box"><Search size={17}/><input placeholder={`Search ${kind}...`} value={search} onChange={e=>setSearch(e.target.value)}/></div><span className="result-count">{items.length} records</span></div><div className="table-wrap"><table><thead><tr>{cfg.columns.map(c=><th key={c.key}>{c.label}</th>)}<th>Actions</th></tr></thead><tbody>{items.map(item=><tr key={item._id}>{cfg.columns.map(c=><td key={c.key}>{c.key==="status"?<select className="inline-select" value={item[c.key]||""} onChange={e=>updateStatus(item,c.key,e.target.value)}>{(cfg.fields.find(f=>f.key===c.key)?.options||[item[c.key]]).map((o:string)=><option key={o}>{o}</option>)}</select>:c.key==="priority"?<span className={`priority priority-${String(item[c.key]||"medium").toLowerCase()}`}>{item[c.key]}</span>:c.key==="score"?<button className="score-button" onClick={()=>scoreLead(item)} title="Calculate lead insights">{item.score||"Score"} <Sparkles size={13}/></button>:c.key==="amount"?money(item[c.key]):c.key==="departureAt"||c.key==="arrivalAt"?dateTime(item[c.key]):c.key.toLowerCase().includes("date")||c.key==="validUntil"?date(item[c.key]):item[c.key]||"—"}</td>)}<td>{kind==="bookings"&&item.paymentStatus!=="Paid"&&<button className="secondary-button" onClick={async()=>{try{const r=await api<AnyRecord>("/payments/checkout-session",{method:"POST",body:JSON.stringify({bookingId:item._id})});if(r.checkoutUrl)window.location.assign(r.checkoutUrl);}catch(e:any){setError(e.message);}}}><CreditCard size={14}/> Checkout</button>} <button className="delete-button" onClick={()=>remove(item)}>Delete</button></td></tr>)}{!items.length&&<tr><td colSpan={cfg.columns.length+1} className="empty">No records found. Add one to get started.</td></tr>}</tbody></table></div></div>
  {modal&&<div className="modal-backdrop" onClick={()=>setModal(false)}><form className="modal-card" onSubmit={save} onClick={e=>e.stopPropagation()}><div className="modal-heading"><div><h2>Add {kind==="bookings"?"flight booking":kind.slice(0,-1)||kind}</h2><p>{kind==="bookings"?"Required fields are marked *. The PNR must be unique within your agency.":"Required fields are marked *."}</p></div><button type="button" className="icon-button" onClick={()=>setModal(false)}><X size={19}/></button></div><div className="form-grid">{cfg.fields.map(field=>{const required=requiredFields[kind]?.includes(field.key)??false;return <label className={field.type==="textarea"?"wide-field":""} key={field.key}>{field.label}{required?" *":""}{field.type==="select"?<select required={required} value={form[field.key]||field.options?.[0]||""} onChange={e=>updateFormField(field.key,field.type,e.target.value)}>{field.options?.map(o=><option key={o}>{o}</option>)}</select>:field.type==="textarea"?<textarea rows={3} value={form[field.key]||""} onChange={e=>updateFormField(field.key,field.type,e.target.value)}/>:<input required={required} type={field.type||"text"} min={field.type==="number"?(field.key==="passengers"?1:0):undefined} max={field.key==="passengers"?9:undefined} maxLength={field.key==="bookingReference"?20:field.key==="origin"||field.key==="destination"?3:undefined} minLength={field.key==="bookingReference"?4:field.key==="origin"||field.key==="destination"?3:undefined} pattern={field.key==="bookingReference"?"[A-Za-z0-9-]+":field.key==="origin"||field.key==="destination"?"[A-Za-z]{3}":undefined} placeholder={field.key==="bookingReference"?"e.g. ABC123":field.key==="origin"||field.key==="destination"?"3-letter IATA code":undefined} value={form[field.key]||""} onChange={e=>updateFormField(field.key,field.type,e.target.value)}/>}</label>})}</div>{error&&<div className="error-box" role="alert">{error}</div>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setModal(false)}>Cancel</button><button className="primary-button" disabled={busy}>{busy?"Saving...":"Save record"}</button></div></form></div>}</div>;
}

/* Legacy flight-provider UI disabled in favor of Google-grounded web research.
function FlightSearch(){
  const [origin,setOrigin]=useState("JFK"); const [destination,setDestination]=useState("LAX"); const [departureDate,setDepartureDate]=useState(""); const [returnDate,setReturnDate]=useState(""); const [adults,setAdults]=useState("1"); const [offers,setOffers]=useState<AnyRecord[]>([]); const [currency,setCurrency]=useState("USD"); const [loading,setLoading]=useState(false); const [error,setError]=useState(""); const [source,setSource]=useState(""); const [insight,setInsight]=useState(""); const [insightLoading,setInsightLoading]=useState(false); const [insightError,setInsightError]=useState("");
  async function search(e:React.FormEvent){e.preventDefault();setLoading(true);setError("");setInsight("");setInsightError("");setOffers([]);try{const result=await api<AnyRecord>("/flights/search",{method:"POST",body:JSON.stringify({origin:origin.toUpperCase(),destination:destination.toUpperCase(),departureDate,returnDate:returnDate||undefined,adults:Number(adults),currencyCode:currency})});setOffers(result.offers||[]);setSource(result.source||"");}catch(e:any){setError(e.message);}finally{setLoading(false);}}
  async function compareOffers(){setInsightLoading(true);setInsightError("");setInsight("");try{const result=await api<AnyRecord>("/flights/insights",{method:"POST",body:JSON.stringify({origin:origin.toUpperCase(),destination:destination.toUpperCase(),departureDate,returnDate:returnDate||undefined,adults:Number(adults),currency,offers:offers.slice(0,10).map((offer:any,index:number)=>({id:String(offer.id||index+1),price:{currency:String(offer.price?.currency||currency),grandTotal:String(offer.price?.grandTotal||"")},itineraries:(offer.itineraries||[]).slice(0,2).map((itinerary:any)=>({segments:(itinerary.segments||[]).slice(0,12).map((segment:any)=>({departure:{iataCode:String(segment.departure?.iataCode||""),at:String(segment.departure?.at||"")},arrival:{iataCode:String(segment.arrival?.iataCode||""),at:String(segment.arrival?.at||"")},carrierCode:String(segment.carrierCode||""),number:String(segment.number||"")}))}))}))})});setInsight(result.insight);}catch(e:any){setInsightError(e.message);}finally{setInsightLoading(false);}}
  return <div className="page-content"><div className="welcome-row"><div><div className="eyebrow dark-eyebrow"><Plane size={14}/> FLIGHT INVENTORY</div><h1>Flight search</h1><p className="page-subtitle">Search live flight offers through Amadeus, then ask Google Gemini to compare the results. AI does not create fares or availability.</p></div></div><section className="panel assistant-form-panel"><form onSubmit={search} className="form-grid"><label>From airport (IATA)<input required minLength={3} maxLength={3} value={origin} onChange={e=>setOrigin(e.target.value.toUpperCase())}/></label><label>To airport (IATA)<input required minLength={3} maxLength={3} value={destination} onChange={e=>setDestination(e.target.value.toUpperCase())}/></label><label>Departure date<input required type="date" min={new Date().toISOString().slice(0,10)} value={departureDate} onChange={e=>setDepartureDate(e.target.value)}/></label><label>Return date (optional)<input type="date" min={departureDate||new Date().toISOString().slice(0,10)} value={returnDate} onChange={e=>setReturnDate(e.target.value)}/></label><label>Adults<input type="number" min="1" max="9" value={adults} onChange={e=>setAdults(e.target.value)}/></label><label>Currency<select value={currency} onChange={e=>setCurrency(e.target.value)}><option>USD</option><option>INR</option><option>EUR</option><option>GBP</option></select></label><div className="wide-field"><button className="primary-button" disabled={loading}><Search size={16}/>{loading?"Searching live inventory…":"Search flights"}</button></div></form>{error&&<div className="error-box">{error}</div>}</section>{source&&<p className="muted">Inventory provider: {source}. Availability and prices may change before ticketing.</p>}<div className="panel resource-panel"><div className="resource-toolbar"><b>Flight offers</b><span className="result-count">{offers.length} offers</span></div>{offers.length>0&&<div className="flight-ai-tools"><button className="secondary-button" onClick={compareOffers} disabled={insightLoading}><Sparkles size={15}/>{insightLoading?"Comparing offers…":"Compare offers with Gemini"}</button><small>AI compares only the flight-provider data shown below.</small></div>}{insightError&&<div className="error-box" role="alert">{insightError}</div>}{insight&&<div className="flight-insight"><b><Sparkles size={15}/> Gemini comparison</b><p>{insight}</p><small>AI-generated comparison; confirm current prices and fare rules with the provider.</small></div>}<div className="table-wrap"><table><thead><tr><th>Offer</th><th>Itinerary</th><th>Price</th><th>Provider</th></tr></thead><tbody>{offers.map((offer:any,i:number)=>{const itineraries=offer.itineraries||[];const first=itineraries[0]?.segments?.[0];const last=itineraries[0]?.segments?.slice(-1)[0];return <tr key={offer.id||i}><td>{offer.id||`Offer ${i+1}`}</td><td>{first?`${first.departure.iataCode} ${new Date(first.departure.at).toLocaleString()} → ${last.arrival.iataCode} ${new Date(last.arrival.at).toLocaleString()}`:"See offer details"}<br/><small>{(itineraries[0]?.segments||[]).map((s:any)=>`${s.carrierCode}${s.number}`).join(" · ")}</small></td><td>{offer.price?.currency} {offer.price?.grandTotal}</td><td>Amadeus</td></tr>})}{!offers.length&&<tr><td colSpan={4} className="empty">{loading?"Searching…":"Search live inventory to view available offers."}</td></tr>}</tbody></table></div></div><p className="muted">Search results are offers, not confirmed reservations. Booking creation, PNR issuance, seats/baggage ancillaries, and ticketing require an enabled provider booking workflow and appropriate credentials.</p></div>
}
*/

function Assistant(){
  const [destination,setDestination]=useState("Bali");const [budget,setBudget]=useState("180000");const [travelers,setTravelers]=useState("2");const [departureDate,setDepartureDate]=useState("");const [status,setStatus]=useState("Quote Sent");const [notes,setNotes]=useState("Customer asked for a quote today");const [result,setResult]=useState<AnyRecord|null>(null);const [loading,setLoading]=useState(false);const [error,setError]=useState("");
  async function analyze(e:React.FormEvent){e.preventDefault();setLoading(true);setError("");try{setResult(await api("/ai/lead-insights",{method:"POST",body:JSON.stringify({destination,budget:Number(budget),travelers:Number(travelers),departureDate,status,notes})}));}catch(e:any){setError(e.message);}finally{setLoading(false);}}
  return <div className="page-content"><div className="welcome-row"><div><div className="eyebrow dark-eyebrow"><Sparkles size={14}/> TRAVEL INTELLIGENCE</div><h1>AI Sales Copilot</h1><p className="page-subtitle">Gemini-powered travel sales guidance based on the inquiry details you provide.</p></div></div><div className="assistant-layout"><section className="panel assistant-form-panel"><div className="assistant-title"><div className="ai-symbol large"><Sparkles size={22}/></div><div><h3>Lead insight generator</h3><p>Enter a travel inquiry to score it and suggest a follow-up with Google Gemini.</p></div></div><form onSubmit={analyze} className="form-grid"><label>Destination<input value={destination} onChange={e=>setDestination(e.target.value)}/></label><label>Budget (INR)<input type="number" min="0" value={budget} onChange={e=>setBudget(e.target.value)}/></label><label>Travelers<input type="number" min="1" value={travelers} onChange={e=>setTravelers(e.target.value)}/></label><label>Departure date<input type="date" value={departureDate} onChange={e=>setDepartureDate(e.target.value)}/></label><label className="wide-field">Current pipeline status<select value={status} onChange={e=>setStatus(e.target.value)}>{["New","Contacted","Qualified","Itinerary Sent","Quote Sent","Negotiation","Booked","Lost"].map(s=><option key={s}>{s}</option>)}</select></label><label className="wide-field">Conversation notes<textarea rows={4} value={notes} onChange={e=>setNotes(e.target.value)}/></label><div className="wide-field"><button className="primary-button" disabled={loading}><Sparkles size={16}/>{loading?"Analyzing...":"Generate lead insights"}</button></div></form>{error&&<div className="error-box" role="alert">{error}</div>}</section><section className="panel insight-result"><div className="result-kicker"><span className="ai-dot"/> GEMINI INSIGHT REPORT</div>{result?<><div className="score-ring" style={{"--score":`${result.score}%`} as React.CSSProperties}><div><b>{result.score}</b><small>/100</small></div></div><div className={`priority priority-${String(result.priority).toLowerCase()}`}>{result.priority} priority</div><h3>Recommended next action</h3><p>{result.nextAction}</p><h4>Signals detected</h4>{result.reasons.map((r:string)=><div className="signal" key={r}><span>✓</span>{r}</div>)}<small className="disclaimer">{result.disclaimer}</small></>:<div className="result-empty"><div className="empty-spark"><Sparkles size={25}/></div><h3>Your insight will appear here</h3><p>Run the analysis to see a lead score, the signals behind it, and a suggested next action.</p></div>}</section></div></div>;
}
export default App;