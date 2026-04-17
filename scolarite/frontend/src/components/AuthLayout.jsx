import "./auth-ui.css";

/**
 * imageUrl: string (right panel background)
 * title/subtitle: left text
 */
export default function AuthLayout({ title, subtitle, imageUrl, children, bottomLeft, bottomRight }) {
  const showImage = !!imageUrl;
  return (
    <div className={`ui-page${!showImage ? " ui-page--no-image" : ""}`}>
      <div className={`ui-shell${!showImage ? " ui-shell--no-image" : ""}`}>
        {/* LEFT */}
        <div className="ui-left">
          <div className="ui-top">
            <div className="ui-pill">Crextio</div>
          </div>

          <div className="ui-title">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>

          {children}

          <div className="ui-bottom">
            <div>{bottomLeft}</div>
            <div>{bottomRight}</div>
          </div>
        </div>

        {/* RIGHT */}
        {showImage && (
        <div className="ui-right">
          <button className="ui-close" type="button">✕</button>

          <div
            className="ui-photo"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.12), rgba(0,0,0,.38)), url("${imageUrl}")`,
            }}
          />

          <div className="ui-chip top">
            <div className="ui-chip-head ui-chip-yellow">
              <span>Task Review With Team</span>
              <span className="dot" />
            </div>
            <div className="ui-chip-time">09:30am - 10:00am</div>
          </div>

          <div className="ui-calendar">
            <div className="ui-cal-grid">
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div key={d}>{d}</div>)}
              {["22","23","24","25","26","27","28"].map(n => (
                <div key={n} className="ui-cal-num">{n}</div>
              ))}
            </div>
          </div>

          <div className="ui-chip bottom">
            <div className="ui-chip-head">
              <span>Daily Meeting</span>
              <span className="dot" />
            </div>
            <div className="ui-chip-time">12:00pm - 01:00pm</div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}