'use client';

import React, { useState } from 'react';
import { BookUser, Smartphone, AlertCircle, X, Check } from 'lucide-react';

interface ContactResult {
  name: string;
  phone: string;
}

interface ContactPickerButtonProps {
  onSelect: (contact: ContactResult) => void;
  label?: string;
  variant?: 'banner' | 'button' | 'icon';
  className?: string;
}

interface NavigatorWithContacts extends Navigator {
  contacts?: {
    select(
      properties: ('name' | 'tel' | 'email')[],
      options?: { multiple?: boolean }
    ): Promise<Array<{ name?: string[]; tel?: string[]; email?: string[] }>>;
    getProperties(): Promise<string[]>;
  };
}

export function isContactPickerSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as NavigatorWithContacts;
  return !!(nav.contacts && 'ContactsManager' in window);
}

export default function ContactPickerButton({
  onSelect,
  label = 'Select from Tablet Contacts',
  variant = 'button',
  className = '',
}: ContactPickerButtonProps) {
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [pickedSuccess, setPickedSuccess] = useState(false);

  const handlePickContact = async () => {
    const nav = navigator as NavigatorWithContacts;

    if (nav.contacts && 'ContactsManager' in window) {
      try {
        const contacts = await nav.contacts.select(['name', 'tel'], { multiple: false });

        if (contacts && contacts.length > 0) {
          const contact = contacts[0];
          const rawName = (contact.name && contact.name[0]) || '';
          const rawTel = (contact.tel && contact.tel[0]) || '';

          // Clean phone number: keep digits and optional leading +
          let cleanPhone = rawTel.replace(/[\s\-()]/g, '');
          // If country code is 91 or +91 with 10 digits, simplify
          if (cleanPhone.startsWith('+91')) {
            cleanPhone = cleanPhone.substring(3);
          } else if (cleanPhone.startsWith('91') && cleanPhone.length > 10) {
            cleanPhone = cleanPhone.substring(2);
          }

          onSelect({
            name: rawName.trim(),
            phone: cleanPhone.trim(),
          });

          setPickedSuccess(true);
          setTimeout(() => setPickedSuccess(false), 2500);
        }
      } catch (err: unknown) {
        // User cancelled the native picker dialog or denied permission
        console.info('Contact selection was dismissed or cancelled:', err);
      }
    } else {
      // Not supported on current browser/environment (e.g., desktop browser or insecure HTTP)
      setShowHelpModal(true);
    }
  };

  return (
    <>
      {variant === 'banner' ? (
        <div
          className={`flex items-center justify-between p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl ${className}`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500 text-white rounded-lg shadow-2xs">
              <BookUser className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <span>Tablet Contact Book</span>
                {pickedSuccess && (
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-bold flex items-center gap-0.5">
                    <Check className="w-2.5 h-2.5" /> Selected!
                  </span>
                )}
              </div>
              <div className="text-[11px] text-amber-800/80">
                Pick contact directly from your tablet contacts
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handlePickContact}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-lg text-xs font-bold shadow-2xs transition"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        </div>
      ) : variant === 'icon' ? (
        <button
          type="button"
          onClick={handlePickContact}
          title="Pick from Tablet Contacts"
          className={`p-1.5 text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-xs font-semibold transition ${className}`}
        >
          <BookUser className="w-3.5 h-3.5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={handlePickContact}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition ${className}`}
        >
          <BookUser className="w-3.5 h-3.5 text-amber-600" />
          <span>{pickedSuccess ? '✓ Contact Selected!' : label}</span>
        </button>
      )}

      {/* Helpful info modal for desktop / unsupported browsers */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-amber-800">
                <Smartphone className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-black text-slate-900">Tablet Contact Picker</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <strong>How Tablet Contacts Work:</strong>
                  <p className="mt-1">
                    When opening this software on your <strong>Android Tablet</strong> (via Google Chrome over HTTPS or localhost), tapping this button immediately opens your tablet&apos;s native contact book so you can pick any customer or karigar.
                  </p>
                </div>
              </div>

              <p>
                On desktop computers or non-Android browsers, the browser security policy restricts access to the phone book. You can type the name and phone number directly into the form.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
