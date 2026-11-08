import { Link } from 'react-router-dom'
import LegalDocument from '../components/legal/LegalDocument'
import { business, responsibleName } from '../config/business'
import { usePageTitle } from '../hooks/usePageTitle'
import { ROUTES } from '../utils/routes'

/** Términos y condiciones de uso de la plataforma y del servicio de reparación. */
export default function TermsPage() {
  usePageTitle('Términos y condiciones')
  const n = business.name

  const sections = [
    {
      id: 'aceptacion',
      title: 'Aceptación',
      content: (
        <p>
          Estos términos regulan el uso del sitio y de los servicios de reparación que ofrece <strong>{responsibleName}</strong> (“{n}”). Al crear una cuenta
          o solicitar un servicio confirmas que los leíste y los aceptas. Si no estás de acuerdo, no utilices la plataforma.
        </p>
      ),
    },
    {
      id: 'servicio',
      title: 'Descripción del servicio',
      content: (
        <>
          <p>
            {n} te permite registrar tu dispositivo, describir la falla, obtener un diagnóstico preliminar, comunicarte con un técnico, aprobar presupuestos,
            pagar y dar seguimiento a la reparación hasta la entrega.
          </p>
          <p>
            El diagnóstico del asistente es <strong>orientativo</strong>: se basa en tus respuestas y no sustituye la revisión física de un técnico. Si eliges
            seguir sus recomendaciones por tu cuenta, lo haces bajo tu responsabilidad.
          </p>
        </>
      ),
    },
    {
      id: 'cuenta',
      title: 'Tu cuenta',
      content: (
        <ul>
          <li>Debes proporcionar información verdadera y mantenerla actualizada.</li>
          <li>Eres responsable de la confidencialidad de tu contraseña y de la actividad realizada con tu cuenta.</li>
          <li>Debes confirmar tu correo electrónico para usar la cuenta.</li>
          <li>Podemos suspender cuentas que hagan un uso indebido de la plataforma.</li>
        </ul>
      ),
    },
    {
      id: 'presupuesto',
      title: 'Diagnóstico técnico y presupuesto',
      content: (
        <>
          <p>
            El técnico asignado revisará tu caso y te enviará un presupuesto con el diagnóstico, el costo de mano de obra, el costo de las piezas y el tiempo
            estimado. Ningún trabajo con costo se realiza sin que aceptes el presupuesto.
          </p>
          <p>
            Si durante la reparación se detecta una falla adicional que cambie el costo, se te informará y se requerirá tu aprobación antes de continuar. Puedes
            rechazar el presupuesto; en ese caso el técnico podrá enviarte una nueva propuesta.
          </p>
        </>
      ),
    },
    {
      id: 'pagos',
      title: 'Pagos',
      content: (
        <>
          <ul>
            <li>
              Al aceptar el presupuesto se solicita un <strong>anticipo del 50 %</strong> del costo total para iniciar la reparación.
            </li>
            <li>El saldo restante se paga cuando la reparación termina y antes de la entrega del dispositivo.</li>
            <li>
              Puedes pagar con tarjeta de crédito o débito a través de <strong>Stripe</strong>, o en efectivo o transferencia en el centro de servicio.
            </li>
            <li>Los precios se expresan en pesos mexicanos.</li>
          </ul>
          <p>
            Las cancelaciones y los reembolsos se atenderán conforme a las condiciones informadas en tu presupuesto y a la Ley Federal de Protección al
            Consumidor.
          </p>
        </>
      ),
    },
    {
      id: 'recoleccion',
      title: 'Recolección, entrega y resguardo',
      content: (
        <>
          <p>
            Cuando solicites recolección o entrega a domicilio, deberás proporcionar una dirección correcta y estar disponible en el horario elegido. Podrás
            seguir cada etapa desde tu cuenta.
          </p>
          <p>
            Antes de entregar tu dispositivo te recomendamos <strong>respaldar tu información</strong>, retirar tarjetas SIM y de memoria, y desvincular tus
            cuentas cuando sea posible. {n} cuidará tu equipo, pero no puede garantizar la conservación de la información almacenada, especialmente en fallas de
            almacenamiento o de tarjeta lógica.
          </p>
        </>
      ),
    },
    {
      id: 'piezas',
      title: 'Piezas y garantía',
      content: (
        <>
          <p>
            Las piezas utilizadas se registran en tu solicitud indicando si son originales, compatibles u otras. La verificación mostrada en la plataforma es
            una revisión interna del técnico de {n} y no una certificación del fabricante.
          </p>
          <p>
            La garantía de la reparación, su vigencia y sus condiciones se indican en el presupuesto o en el resumen de la reparación. La garantía no cubre daños
            posteriores por golpes, humedad, manipulación de terceros o fallas distintas a la reparada.
          </p>
        </>
      ),
    },
    {
      id: 'uso',
      title: 'Uso adecuado de la plataforma',
      content: (
        <ul>
          <li>Trata con respeto al personal en el chat y en cualquier comunicación.</li>
          <li>No subas contenido ilícito, ofensivo o que no esté relacionado con el servicio.</li>
          <li>No intentes acceder a información de otras personas ni vulnerar la seguridad del sitio.</li>
        </ul>
      ),
    },
    {
      id: 'responsabilidad',
      title: 'Responsabilidad',
      content: (
        <p>
          {n} responde por los servicios que presta conforme a la legislación aplicable. No es responsable por fallas preexistentes del dispositivo no
          relacionadas con la reparación, por la pérdida de información no respaldada ni por interrupciones del sitio ajenas a su control.
        </p>
      ),
    },
    {
      id: 'privacidad',
      title: 'Privacidad',
      content: (
        <p>
          El tratamiento de tus datos personales se rige por nuestro{' '}
          <Link to={ROUTES.PRIVACY} className="font-semibold text-electric hover:underline">
            Aviso de privacidad
          </Link>
          .
        </p>
      ),
    },
    {
      id: 'cambios',
      title: 'Cambios a estos términos',
      content: (
        <p>
          Podemos actualizar estos términos. Los cambios se publicarán en esta página con su fecha de actualización y aplicarán a los servicios solicitados a
          partir de su publicación.
        </p>
      ),
    },
    {
      id: 'ley',
      title: 'Legislación aplicable',
      content: (
        <p>
          Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Como consumidor, puedes acudir a la Procuraduría Federal del Consumidor
          (PROFECO) para cualquier queja o reclamación.
          {business.email && (
            <>
              {' '}
              Para dudas sobre estos términos escríbenos a{' '}
              <a href={`mailto:${business.email}`} className="font-semibold text-electric hover:underline">
                {business.email}
              </a>
              .
            </>
          )}
        </p>
      ),
    },
  ]

  return <LegalDocument eyebrow="Información legal" title="Términos y condiciones" updated={business.legalUpdated} sections={sections} />
}
