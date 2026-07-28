import { Link } from "@tanstack/react-router";
import { GraduationCap, Mail, Phone } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="font-display text-lg font-extrabold">Study DZ</span>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-7 text-muted-foreground">
            منصة سحابية جزائرية متكاملة لإدارة التعليم والتعلم، تجمع الإدارة والتعليم والتواصل
            ومتابعة الأداء في نظام واحد لكل مؤسسة.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-bold">روابط سريعة</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/features" className="hover:text-foreground">
                المميزات
              </Link>
            </li>
            <li>
              <Link to="/pricing" className="hover:text-foreground">
                الأسعار
              </Link>
            </li>
            <li>
              <Link to="/register" className="hover:text-foreground">
                تسجيل مؤسسة جديدة
              </Link>
            </li>
            <li>
              <Link to="/subscribe" className="hover:text-foreground">
                الاشتراك والدفع عبر CCP
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-foreground">
                التواصل والدعم
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold">التواصل</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0" />
              <span dir="ltr">isaacdiaf2@gmail.com</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0" />
              <span>الدعم متاح من الأحد إلى الخميس</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Study DZ — جميع الحقوق محفوظة.
      </div>
    </footer>
  );
}
