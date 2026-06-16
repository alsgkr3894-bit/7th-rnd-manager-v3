export function ReportActivityCell({ views, links }) {
  return (
    <td>
      <div className="report-activity">
        <span title="조회수" className="activity-pill">
          <svg
            viewBox="0 0 24 24"
            width="11"
            height="11"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          {views}
        </span>
        {links > 0 && (
          <span
            title="활성 공유 링크"
            className="activity-pill"
            style={{ background: '#F0EBFF', color: '#6B3FCB' }}
          >
            🔗{links}
          </span>
        )}
      </div>
    </td>
  );
}
