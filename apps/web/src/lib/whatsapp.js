export const WHATSAPP_NUMBER = "549XXXXXXXXXX";

const MESSAGES = {
  violencia: "Hola, quiero información sobre Traza 360 para protección personal y seguimiento seguro.",
  adulto_mayor: "Hola, quiero información sobre Traza 360 para cuidado y trazabilidad de adultos mayores vulnerables.",
  ninos: "Hola, quiero información sobre Traza 360 para seguimiento y protección de niños que se manejan solos.",
  trabajo_domicilio: "Hola, quiero información sobre Traza 360 para trabajadores que realizan tareas en domicilios.",
  acompanamiento_nocturno: "Hola, quiero información sobre Traza 360 para acompañamiento nocturno y red de seguridad.",
  hogar: "Hola, quiero información sobre Traza 360 para protección del hogar y detección de intrusos.",
  planes: "Hola, quiero consultar los planes de Traza 360 y sus beneficios.",
  demo: "Hola, quiero solicitar una demo de Traza 360 para conocer cómo funciona.",
  general: "Hola, quiero conocer cómo funciona Traza 360 y sus planes.",
};

export function openWhatsApp(tipo = "general") {
  const message = MESSAGES[tipo] || MESSAGES.general;
  const encoded = encodeURIComponent(message);
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
