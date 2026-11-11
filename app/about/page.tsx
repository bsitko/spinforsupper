import type { Metadata } from "next";
import Logo from "../Logo";
import TipLink from "../TipLink";

export const metadata: Metadata = {
  title: "About · Spin for Supper",
  description: "Spin for Supper helps you decide where to eat: browse the best-rated spots near you, or spin the wheel and let fate pick dinner.",
};

export default function About() {
  return (
    <main className="legal about">
      <p>
        <a href="/">← Back to the wheel</a>
      </p>
      <Logo className="logo" />
      <h1>About Spin for Supper</h1>
      <p>
        “Where do you want to eat?” “I don’t know, where do <i>you</i> want to eat?” We’ve all been stuck in that loop. Spin for Supper gets you out of it.
      </p>

      <h2>How it works</h2>
      <ul>
        <li>
          <b>Tell us where you are</b> by zip, city, or neighborhood, or tap “Near me.”
        </li>
        <li>
          <b>Pick what sounds good:</b> one craving or a few, your budget, a minimum rating, kids along, open now.
        </li>
        <li>
          <b>Browse or spin.</b> See the best-rated matches in a list, or let the wheel decide. Tap any place for photos, what people say, and directions.
        </li>
        <li>
          <b>Make it yours.</b> Add or remove places on the wheel, add your own spot, save favorites, hide places you’re done with, and share the winner with
          your group chat.
        </li>
      </ul>

      <h2>Where the listings come from</h2>
      <p>
        Restaurant details, ratings, and photos come from Google Maps. We don’t take money to rank places: the list is ordered by rating, weighted so a place
        with hundreds of reviews isn’t beaten by one with three.
      </p>

      <h2>How we keep the lights on</h2>
      <p>
        Spin for Supper is free. Some “Book a table” and “Order delivery” buttons may earn us a small commission at no cost to you. If the wheel saved your
        dinner, you can also buy us a coffee.
      </p>
      <TipLink big />

      <p className="muted-note">
        <a href="/privacy">Privacy</a>
      </p>
    </main>
  );
}
