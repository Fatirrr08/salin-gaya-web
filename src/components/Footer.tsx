import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-card border-t border-border mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-display text-xl font-bold text-primary mb-4">Salin Gaya</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Platform thrifting premium untuk fashion & lifestyle. Temukan barang secondhand berkualitas tinggi dengan harga terjangkau.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-3">Tentang</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-primary transition-colors">Tentang Kami</Link></li>
              <li><Link to="/" className="hover:text-primary transition-colors">Cara Kerja</Link></li>
              <li><Link to="/" className="hover:text-primary transition-colors">Karir</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-3">Bantuan</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-primary transition-colors">FAQ</Link></li>
              <li><Link to="/" className="hover:text-primary transition-colors">Hubungi Kami</Link></li>
              <li><Link to="/" className="hover:text-primary transition-colors">Pengembalian</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-primary transition-colors">Kebijakan Privasi</Link></li>
              <li><Link to="/" className="hover:text-primary transition-colors">Syarat & Ketentuan</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-border text-center text-sm text-muted-foreground">
          © 2026 Salin Gaya. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
