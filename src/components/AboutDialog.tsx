import { useEffect, useId, useRef } from 'react'
import { AUTHOR_NAME, HORAIRES_PAGE_URL, SUPPORT_EMAIL } from '../about'
import { CloseIcon } from './Icons'
import './AboutDialog.css'

interface AboutDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function AboutDialog({ isOpen, onClose }: AboutDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  // Vrai si le dernier appui a commencé sur le fond assombri, et non dans le panneau.
  const pressStartedOnBackdropRef = useRef(false)
  const titleId = useId()

  // Ouvre ou ferme le <dialog> natif selon isOpen.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen && !dialog.open) dialog.showModal()
    if (!isOpen && dialog.open) dialog.close()
  }, [isOpen])

  // Fermeture native : déclenche l'événement close, qui prévient le parent (onClose).
  function closeDialog() {
    dialogRef.current?.close()
  }

  return (
    <dialog
      ref={dialogRef}
      className="about-dialog"
      aria-labelledby={titleId}
      onClose={onClose}
      onPointerDown={(event) => {
        pressStartedOnBackdropRef.current = event.target === event.currentTarget
      }}
      onClick={(event) => {
        // Clic sur le fond assombri : la cible est le <dialog> lui-même (il n'a pas de padding).
        if (event.target === event.currentTarget && pressStartedOnBackdropRef.current) {
          closeDialog()
        }
      }}
    >
      <div className="about-panel">
        <header className="about-header">
          <h2 id={titleId}>À propos</h2>
          <button type="button" className="about-close" onClick={closeDialog} aria-label="Fermer">
            <CloseIcon />
          </button>
        </header>

        <div className="about-content">
          <h3 className="about-app-name">Horaires de Cours</h3>
          <p>
            Les horaires des cours en sciences infirmières de l'UNIL, par volée, modalité et
            option.
          </p>

          <section className="about-section">
            <h3>Avertissement</h3>
            <p>
              Ce site n'est pas un site officiel et n'est pas lié à l'Université de Lausanne. Il
              lit le fichier d'horaires publié sur la page officielle de l'IUFRS. Si l'UNIL modifie
              cette page ou la structure du fichier, les horaires peuvent être incomplets, erronés
              ou ne plus s'afficher. En cas de doute, seul le fichier officiel fait foi.
            </p>
            <a
              className="about-external-link"
              href={HORAIRES_PAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Voir la page officielle des horaires
            </a>
          </section>

          <section className="about-section">
            <h3>Confidentialité</h3>
            <p>
              Aucun compte, aucun cookie, aucun outil de suivi. Seule votre dernière sélection est
              enregistrée, sur votre appareil, pour rouvrir directement votre horaire.
            </p>
          </section>

          <section className="about-section">
            <h3>Contact</h3>
            <p>Une question, un problème ?</p>
            <button
              type="button"
              className="secondary-button about-action"
              onClick={openSupportEmail}
            >
              Contacter le support
            </button>
            {/* Pour les ordinateurs sans messagerie configurée : adresse à copier. */}
            <p className="about-email">
              ou écrivez à <span className="about-email-address">{SUPPORT_EMAIL}</span>
            </p>
          </section>

          <p className="about-credit">Développé par {AUTHOR_NAME}</p>
        </div>
      </div>
    </dialog>
  )
}

// Ouvre la messagerie avec un e-mail prérempli. L'adresse de la page, le navigateur et la
// date sont lus au moment du clic.
function openSupportEmail() {
  window.location.href = buildSupportMailto()
}

function buildSupportMailto(): string {
  const subject = 'Horaires de Cours, site web : support'
  const body = [
    'Bonjour,',
    '',
    'Je rencontre un problème avec le site Horaires de Cours.',
    '',
    '[Décrivez le problème ici]',
    '',
    '---',
    'Informations techniques',
    `Adresse : ${window.location.href}`,
    `Navigateur : ${navigator.userAgent}`,
    `Date : ${new Date().toLocaleString('fr-CH')}`,
  ].join('\r\n')
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
