export default function Footer() {
  return (
    <footer className="site-footer">
      <a className="brand footer-brand" href="#home">
        <span className="brand-mark">A</span>
        <span className="brand-copy">
          <strong>THE GRAND AURELIA</strong>
          <small>A STAY BEYOND EXPECTATIONS</small>
        </span>
      </a>
      
      <span className="footer-copyright">
        © {new Date().getFullYear()} The Grand Aurelia
      </span>
    </footer>
  );
}
