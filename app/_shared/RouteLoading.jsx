import styles from './RouteLoading.module.css';

export default function RouteLoading() {
  return (
    <div className={styles.wrap}>
      <span className={styles.spinner} aria-label="로딩 중" />
    </div>
  );
}
