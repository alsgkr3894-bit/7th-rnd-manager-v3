export default function ErrorPage({ statusCode }) {
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>{statusCode ? `${statusCode} error` : 'Application error'}</h1>
      <p>Please reload the page or return to the home screen.</p>
    </main>
  );
}

ErrorPage.getInitialProps = ({ res, err }) => {
  const statusCode = res?.statusCode || err?.statusCode || 500;
  return { statusCode };
};
