import { useState } from "react";
import { ArrowUpRight, Plane, Search, Sparkles } from "lucide-react";
import { api } from "./api";

type SearchSource = { title: string; uri: string };
type FlightResearch = {
  summary: string;
  sources: SearchSource[];
  searchQueries: string[];
  searchedAt: string;
};

export default function FlightSearch() {
  const [origin, setOrigin] = useState("JFK");
  const [destination, setDestination] = useState("LAX");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [adults, setAdults] = useState("1");
  const [currency, setCurrency] = useState("USD");
  const [result, setResult] = useState<FlightResearch | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const research = await api<FlightResearch>("/flights/search", {
        method: "POST",
        body: JSON.stringify({
          origin: origin.toUpperCase(),
          destination: destination.toUpperCase(),
          departureDate,
          returnDate: returnDate || undefined,
          adults: Number(adults),
          currencyCode: currency
        })
      });
      setResult(research);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Flight web search failed.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="page-content">
    <div className="welcome-row">
      <div>
        <div className="eyebrow dark-eyebrow"><Plane size={14}/> GOOGLE FLIGHT WEB RESEARCH</div>
        <h1>Flight search</h1>
        <p className="page-subtitle">Search public web results with Google Gemini grounding for route and date-specific flight information.</p>
      </div>
    </div>
    <div className="flight-search-warning">
      <b>Indicative web results only</b>
      <span>Google Gemini is not connected to airline inventory. Prices and availability may be outdated, unverified, or unavailable; confirm all details with the airline or seller before booking.</span>
    </div>
    <section className="panel assistant-form-panel">
      <form onSubmit={search} className="form-grid">
        <label>From airport (IATA)<input required pattern="[A-Za-z]{3}" title="Enter a 3-letter airport code" minLength={3} maxLength={3} value={origin} onChange={event => setOrigin(event.target.value.toUpperCase())}/></label>
        <label>To airport (IATA)<input required pattern="[A-Za-z]{3}" title="Enter a 3-letter airport code" minLength={3} maxLength={3} value={destination} onChange={event => setDestination(event.target.value.toUpperCase())}/></label>
        <label>Departure date<input required type="date" min={new Date().toISOString().slice(0, 10)} value={departureDate} onChange={event => setDepartureDate(event.target.value)}/></label>
        <label>Return date (optional)<input type="date" min={departureDate || new Date().toISOString().slice(0, 10)} value={returnDate} onChange={event => setReturnDate(event.target.value)}/></label>
        <label>Adults<input type="number" min="1" max="9" value={adults} onChange={event => setAdults(event.target.value)}/></label>
        <label>Currency<select value={currency} onChange={event => setCurrency(event.target.value)}><option>USD</option><option>INR</option><option>EUR</option><option>GBP</option></select></label>
        <div className="wide-field"><button className="primary-button" disabled={loading}><Search size={16}/>{loading ? "Searching Google…" : "Search Google for flight information"}</button></div>
      </form>
      {error && <div className="error-box" role="alert">{error}</div>}
    </section>
    {result && <section className="panel google-flight-results">
      <div className="google-flight-results-heading">
        <div><div className="eyebrow dark-eyebrow"><Sparkles size={14}/> GEMINI + GOOGLE SEARCH</div><h2>Web research summary</h2></div>
        {result.searchedAt && <small>Search time: {new Date(result.searchedAt).toLocaleString()}</small>}
      </div>
      <p className="google-flight-summary">{result.summary}</p>
      {result.searchQueries.length > 0 && <div className="google-search-queries"><b>Searches used</b>{result.searchQueries.map(query => <span key={query}>{query}</span>)}</div>}
      <div className="google-flight-sources">
        <b>Sources</b>
        {result.sources.length
          ? result.sources.map(source => <a key={source.uri} href={source.uri} target="_blank" rel="noreferrer">{source.title}<ArrowUpRight size={13}/></a>)
          : <span>No source links were returned. Treat the summary as unverified and confirm directly with airlines or sellers.</span>}
      </div>
      <small className="flight-results-disclaimer">Indicative public web research only — not live inventory, a confirmed fare, or a bookable offer.</small>
    </section>}
  </div>;
}
