import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, type RoomSummary } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.js";
import { CreateRoomModal } from "./CreateRoomModal.js";

export function RoomListPage() {
  const { token, user, logout } = useAuth();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return;
    api
      .myRooms(token)
      .then((res) => setRooms(res.rooms))
      .catch((err) => setError(err.message));
  }, [token]);

  async function handleCreate(name: string, defaultRole: "EDITOR" | "VIEWER") {
    if (!token) return;
    const { room } = await api.createRoom(token, name, defaultRole);
    setShowCreate(false);
    navigate(`/room/${room.joinCode}`);
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (joinCode.trim()) navigate(`/room/${joinCode.trim()}`);
  }

  return (
    <div className="room-list-page">
      <header>
        <h1>Your rooms</h1>
        <div>
          <span>{user?.displayName}</span>
          <button onClick={logout}>Log out</button>
        </div>
      </header>

      <section className="actions">
        <button onClick={() => setShowCreate(true)}>+ New room</button>
        <form onSubmit={handleJoin} className="join-form">
          <input
            placeholder="Join code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
          />
          <button type="submit">Join room</button>
        </form>
      </section>

      {error && <p className="error">{error}</p>}

      <ul className="room-list">
        {rooms.map((room) => (
          <li key={room.id}>
            <Link to={`/room/${room.joinCode}`}>{room.name}</Link>
            {room.isEnded && <span className="badge">ended</span>}
            {room.isLocked && !room.isEnded && <span className="badge">locked</span>}
          </li>
        ))}
        {rooms.length === 0 && <li className="empty">No rooms yet — create one to get started.</li>}
      </ul>

      {showCreate && <CreateRoomModal onCreate={handleCreate} onClose={() => setShowCreate(false)} />}
    </div>
  );
}
