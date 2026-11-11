import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy · Spin for Supper" };

export default function Privacy() {
  return (
    <main className="legal">
      <p>
        <a href="/">← Back to the wheel</a>
      </p>
      <h1>Privacy</h1>
      <p>Spin for Supper helps you pick a place to eat. We keep this short because we collect very little.</p>

      <h2>What we use</h2>
      <ul>
        <li>
          <b>Your location or the zip/city you type</b> is sent to our server only to look up nearby restaurants, then passed to Google Places.
          We don&apos;t store it.
        </li>
        <li>
          <b>Restaurant listings</b> come from Google Maps. Google&apos;s own <a href="https://policies.google.com/privacy">privacy policy</a> applies to
          that lookup.
        </li>
        <li>
          <b>Analytics:</b> we use Google Analytics to count visits and which buttons people tap (for example &quot;spin&quot; or &quot;list&quot;). It uses
          cookies. You can block it with any ad or tracker blocker.
        </li>
        <li>
          <b>Counts for running the site:</b> how many searches happen each day and how often outbound buttons are tapped. These are totals, not tied
          to you.
        </li>
        <li>
          <b>Your theme choice</b> is saved in your own browser.
        </li>
      </ul>

      <h2>Links that may earn a commission</h2>
      <p>
        &quot;Book a table&quot; and &quot;Order delivery&quot; may be affiliate links. If you book or order through them we may earn a small commission, at no
        extra cost to you. It never changes which restaurants the wheel picks.
      </p>

      {process.env.NEXT_PUBLIC_CONTACT_EMAIL && (
        <>
          <h2>Questions</h2>
          <p>
            Email <a href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL}`}>{process.env.NEXT_PUBLIC_CONTACT_EMAIL}</a>.
          </p>
        </>
      )}
    </main>
  );
}
