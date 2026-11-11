import { ArrowRight } from "lucide-react";

export default function ClosingBanner() {
  return (
    <section className="closing-banner" id="booking">
      <div>
        <p className="eyebrow hero-eyebrow">
          <span /> YOUR NEXT CHAPTER STARTS HERE
        </p>
        <h2>
          Make room for
          <br />
          <em>something wonderful.</em>
        </h2>
      </div>
      <a className="gold-button" href="#rooms">
        Find your stay <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
      </a>
    </section>
  );
}
