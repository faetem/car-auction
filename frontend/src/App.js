import React, { useState, useEffect } from 'react';

function App() {
  const [user, setUser] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [gameState, setGameState] = useState({ auction: null, timer: 0 });
  const [players, setPlayers] = useState([]);
  const [bidAmount, setBidAmount] = useState("");

  useEffect(() => {
    // On ne tente la connexion QUE si l'utilisateur est enregistré
    if (!user) return;

    const ws = new WebSocket('ws://localhost:4000');

    ws.onopen = () => {
      console.log("Connecté au serveur");
      ws.send(JSON.stringify({ type: 'JOIN', data: user }));
    };

    ws.onmessage = (e) => {
      const { type, data, id } = JSON.parse(e.data);
      if (type === 'WELCOME') setUser(prev => ({ ...prev, id }));
      if (type === 'TICK') setGameState(data);
      if (type === 'UPDATE_PLAYERS') setPlayers(data);
    };

    ws.onclose = () => console.log("Socket fermée");
    ws.onerror = (err) => console.error("Erreur socket", err);

    return () => {
      // On ferme proprement uniquement si socket ouvert
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [user?.name]); // On surveille uniquement le nom pour éviter les boucles infinies

  const register = async () => {
    const res = await fetch('http://localhost:4000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameInput })
    });
    const data = await res.json();
    setUser(data);
  };

  const sendBid = async () => {
    if (!user.id) return;
    await fetch('http://localhost:4000/rpc/bid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id, amount: Number(bidAmount) })
    });
    setBidAmount("");
  };

  if (!user) {
    return (
      <div style={{ padding: '50px' }}>
        <h1>Car auction</h1>
        <input value={nameInput} onChange={e => setNameInput(e.target.value)} placeholder="Name" />
        <button onClick={register}>Enter</button>
      </div>
    );
  }

  const myData = players.find(p => p.id === user.id) || user;

  return (
    <div style={{ padding: '20px' }}>
      <h2>{myData.name} | {myData.coins} coins</h2>
      <div style={{ border: '1px solid black', padding: '10px' }}>
        <h3>Car model : {gameState.auction?.name}</h3>
        <p>Current bid : {gameState.auction?.highestBid} coins | Time left to bid : {gameState.timer}s</p>
        <input type="number" placeholder="Enter amount to bid"value={bidAmount} onChange={e => setBidAmount(e.target.value)} />
        <button onClick={sendBid}>Bid</button>
      </div>
      <h4>Online players :</h4>
      {players.map(p => <div key={p.id}>{p.name} ({p.coins} coins |
        Cars won : {p.wonItems && p.wonItems.length > 0 
        ? p.wonItems.join(', ') 
        : "No car won"})</div>)}
    </div>
  );
}

export default App;