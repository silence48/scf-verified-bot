import { MessageSquare, TwitterIcon } from "lucide-react";
import "@/css/footer.css";

export function Footer() {
    return (
        <footer className="footer">
            <div className="footer-inner">
                <div className="footer-links">
                    <a
                        href="https://communityfund.xyz"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-link"
                    >
                        Community Fund
                    </a>
                    <a
                        href="https://discord.gg/communityfund"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-link-icon"
                    >
                        <MessageSquare className="footer-icon" />
                        <span>Discord</span>
                    </a>
                    <a
                        href="https://x.com/communityfund"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-link-icon"
                    >
                        <TwitterIcon className="footer-icon" />
                        <span>X</span>
                    </a>
                </div>
                <div className="footer-copyright">
                    © 2025 Stellar Community Fund. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
