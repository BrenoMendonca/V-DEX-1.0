import styles from "./ProfileView.module.css";
import TypeBadge from "./TypeBadge";
import LogoutButton from "./LogoutButton";
import AvatarUpload from "./AvatarUpload";
import FavoritePokemonCard from "./FavoritePokemonCard";
import TrainerCard from "./TrainerCard";
import { PokeballIcon } from "./icons";
import { defaultSpriteUrl } from "@/lib/sprites";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export default function ProfileView({ stats, user, trainerCard }) {
  const maxTypeCount = stats.topTypes[0]?.count ?? 1;

  return (
    <div className={styles.page}>
      <PokeballIcon className={styles.pageBall} aria-hidden="true" />

      <div className={styles.content}>
      <div className={styles.header}>
        <AvatarUpload avatar={user?.avatar} />
        <div className={styles.headerText}>
          <p className={styles.title}>{user?.name || user?.login || "Treinador(a)"}</p>
          <p className={styles.subtitle}>
            {user?.name ? `@${user.login}` : "Perfil da sua Pokédex"}
          </p>
        </div>
        <LogoutButton />
      </div>

      <TrainerCard
        trainerId={trainerCard.trainerId}
        name={user?.name || user?.login || "Treinador(a)"}
        gender={user?.gender}
        percent={trainerCard.percent}
        score={trainerCard.score}
        daysSinceStart={trainerCard.daysSinceStart}
        startDate={trainerCard.startDate}
      />

      <FavoritePokemonCard favoritePokemon={user?.favoritePokemon ?? null} />

      <div className={styles.card}>
        <p className={styles.sectionTitle}>Tipos mais capturados</p>
        {stats.topTypes.length === 0 && <p className={styles.empty}>Nenhum Pokémon capturado ainda.</p>}
        {stats.topTypes.map(({ type, count }) => (
          <div key={type} className={styles.typeRow}>
            <TypeBadge type={type} />
            <div className={styles.progressTrack} style={{ flex: 1 }}>
              <div
                className={styles.progressFill}
                style={{ width: `${(count / maxTypeCount) * 100}%` }}
              />
            </div>
            <span className={styles.typeCount}>{count}</span>
          </div>
        ))}
      </div>

      <div className={styles.card}>
        <p className={styles.sectionTitle}>Capturas recentes</p>
        {stats.recentCaptures.length === 0 && (
          <p className={styles.empty}>Escaneie uma carta para começar seu histórico.</p>
        )}
        <div className={styles.recentList}>
          {stats.recentCaptures.map((capture) => (
            <div key={`${capture.name}-${capture.capturedAt}`} className={styles.recentItem}>
              {capture.id && (
                // eslint-disable-next-line @next/next/no-img-element -- sprite pixel art da PokeAPI
                <img src={defaultSpriteUrl(capture.id)} alt="" className={styles.recentSprite} />
              )}
              <div>
                <p className={styles.recentName}>{capture.name.replace(/-/g, " ")}</p>
                <p className={styles.recentDate}>{dateFormatter.format(new Date(capture.capturedAt))}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}
