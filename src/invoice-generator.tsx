import React, { useState } from "react";
import { Download, FileText, User, MapPin, CreditCard } from "lucide-react";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

interface DatiFattura {
  // Dati paziente
  nomePaziente: string;
  codiceFiscalePaziente: string;
  indirizzoPaziente: string;
  capPaziente: string;
  cittaPaziente: string;

  // Dati fattura
  numeroFattura: string;
  dataCompilazione: string;

  // Servizi - tabella
  quantitaServizi: string;
  prezzoUnitario: string;
  totaleServizi: string;
  descrizione: string;

  // Totali
  totaleLordo: string;
  totaleDovuto: string;

  // Pagamento
  ibanPaziente: string;
  dataSaldatura: string;
}

export const InvoiceGenerator: React.FC = () => {
  const [fattura, setFattura] = useState<DatiFattura>({
    nomePaziente: "",
    codiceFiscalePaziente: "",
    indirizzoPaziente: "",
    capPaziente: "",
    cittaPaziente: "",
    numeroFattura: "",
    dataCompilazione: "",
    quantitaServizi: "",
    prezzoUnitario: "",
    totaleServizi: "",
    totaleLordo: "",
    totaleDovuto: "",
    ibanPaziente: "",
    dataSaldatura: "",
    descrizione: "",
  });
  const [isProcessing, setIsProcessing] = useState(false);

  // Calcola automaticamente i totali
  const calcolaTotali = (
    quantita: string,
    prezzoUnitario: string
  ): { totaleServizi: string; totaleDovuto: string } => {
    const qty = parseInt(quantita) || 0;
    const prezzo =
      parseFloat(prezzoUnitario.replace("€", "").replace(",", ".")) || 0;
    const totaleServ = qty * prezzo;
    const totaleDov = totaleServ + 2; // Aggiunge marca da bollo di 2€

    return {
      totaleServizi: `${totaleServ.toFixed(2).replace(".", ",")}€`,
      totaleDovuto: `${totaleDov.toFixed(2).replace(".", ",")}€`,
    };
  };

  // Aggiorna i dati della fattura
  const aggiornaDatiFattura = (campo: keyof DatiFattura, valore: string) => {
    setFattura((prevFattura) => {
      const nuovaFattura = { ...prevFattura, [campo]: valore };

      // Ricalcola automaticamente i totali se cambiano quantità o prezzo
      if (campo === "quantitaServizi" || campo === "prezzoUnitario") {
        const totali = calcolaTotali(
          campo === "quantitaServizi" ? valore : nuovaFattura.quantitaServizi,
          campo === "prezzoUnitario" ? valore : nuovaFattura.prezzoUnitario
        );
        nuovaFattura.totaleServizi = totali.totaleServizi;
        nuovaFattura.totaleLordo = totali.totaleServizi;
        nuovaFattura.totaleDovuto = totali.totaleDovuto;
      }

      return nuovaFattura;
    });
  };

  // Resetta il form con nuovi dati predefiniti
  const resetFattura = () => {
    const nuovoNumero =
      parseInt(fattura.numeroFattura.split("/")[0].replace(/\D/g, "")) + 1;

    setFattura({
      nomePaziente: "",
      codiceFiscalePaziente: "",
      indirizzoPaziente: "",
      capPaziente: "",
      cittaPaziente: "",
      numeroFattura: `${nuovoNumero}a/2025`,
      dataCompilazione: new Date().toLocaleDateString("it-IT"),
      quantitaServizi: "5",
      prezzoUnitario: "50,00€",
      totaleServizi: "250,00€",
      totaleLordo: "250,00€",
      totaleDovuto: "252,00€",
      ibanPaziente: "",
      dataSaldatura: new Date().toLocaleDateString("it-IT"),
      descrizione: "",
    });
  };

  // Genera la fattura
  const generaFattura = async () => {
    setIsProcessing(true);
    try {
      // Carica il template DOCX dalla cartella public
      // In React, per accedere a un file nella cartella public si usa il percorso alla root
      const response = await fetch("/FATTURA_TEMPLATE_TEST.docx");

      if (!response.ok) {
        throw new Error(
          `Impossibile caricare il template: ${response.status} ${response.statusText}`
        );
      }

      const templateBlob = await response.blob();
      const templateArrayBuffer = await templateBlob.arrayBuffer();

      // Utilizza docxtemplater per compilare il template
      const zip = new PizZip(templateArrayBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      // Prepara i dati per il template
      doc.setData({
        NOME_PAZIENTE: fattura.nomePaziente,
        CF_PAZIENTE: fattura.codiceFiscalePaziente,
        INDIRIZZO_PAZIENTE: fattura.indirizzoPaziente,
        CAP_PAZIENTE: fattura.capPaziente,
        CITTA_PAZIENTE: fattura.cittaPaziente,
        NUMERO_FATTURA: fattura.numeroFattura,
        DATA_COMPILAZIONE: fattura.dataCompilazione,
        QUANTITA_SERVIZI: fattura.quantitaServizi,
        PREZZO_UNITARIO: fattura.prezzoUnitario,
        TOTALE_SERVIZI: fattura.totaleServizi,
        TOTALE_LORDO: fattura.totaleLordo,
        TOTALE_DOVUTO: fattura.totaleDovuto,
        IBAN_PAZIENTE: fattura.ibanPaziente,
        DATA_SALDATURA: fattura.dataSaldatura,
        DESCRIZIONE_PRESTAZIONE:
          fattura.descrizione || "Prestazione fisioterapica",
      });

      // Genera il documento
      try {
        doc.render();
      } catch (error: any) {
        console.error("Errore durante la compilazione del template:", error);
        // Mostra dettagli più specifici sull'errore
        if (error.properties && error.properties.errors) {
          console.log("Errori specifici:", error.properties.errors);
        }
        // Verifica i tag non trovati nel template
        if (error.properties && error.properties.explanation) {
          console.log("Spiegazione:", error.properties.explanation);
        }
        throw error;
      }

      // Ottiene il blob del documento compilato
      const out = doc.getZip().generate({
        type: "blob",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      // Scarica il documento
      const url = URL.createObjectURL(out);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fattura_${fattura.numeroFattura.replace(
        "/",
        "_"
      )}_${fattura.nomePaziente.replace(/\s+/g, "_")}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert(`Fattura generata con successo!`);

      // Opzionale: reset del form dopo la generazione
      if (confirm("Vuoi creare una nuova fattura?")) {
        resetFattura();
      }
    } catch (error) {
      console.error("Errore nella generazione:", error);
      alert(
        `Errore durante la generazione della fattura: ${
          error instanceof Error ? error.message : "Errore sconosciuto"
        }`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Generatore Fatture Fisioterapia
        </h1>
        <p className="text-gray-600">
          Gestione automatica delle fatture per prestazioni fisioterapiche
        </p>
      </div>

      {/* Contenitore della fattura */}
      <div className="bg-gray-50 p-6 rounded-lg border mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3
            className="text-lg font-medium flex items-center"
            style={{ color: "#1D4ED8" }}>
            <FileText className="mr-2" size={20} />
            Dati Fattura #{fattura.numeroFattura}
          </h3>
        </div>

        {/* Dati Paziente */}
        <div className="mb-6">
          <h4 className="text-md font-medium mb-3 flex items-center text-blue-700">
            <User className="mr-2" size={16} />
            Dati Paziente
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome Completo
              </label>
              <input
                type="text"
                value={fattura.nomePaziente}
                onChange={(e) => {
                  aggiornaDatiFattura("nomePaziente", e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Mario Rossi"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Codice Fiscale
              </label>
              <input
                type="text"
                value={fattura.codiceFiscalePaziente}
                onChange={(e) =>
                  aggiornaDatiFattura(
                    "codiceFiscalePaziente",
                    e.target.value.toUpperCase()
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="RSSMRA80A01H501Z"
                maxLength={16}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Indirizzo
              </label>
              <input
                type="text"
                value={fattura.indirizzoPaziente}
                onChange={(e) =>
                  aggiornaDatiFattura("indirizzoPaziente", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Via Roma 123"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CAP
              </label>
              <input
                type="text"
                value={fattura.capPaziente}
                onChange={(e) =>
                  aggiornaDatiFattura("capPaziente", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="20100"
                maxLength={5}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Città
              </label>
              <input
                type="text"
                value={fattura.cittaPaziente}
                onChange={(e) =>
                  aggiornaDatiFattura("cittaPaziente", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Milano (MI)"
              />
            </div>
          </div>
        </div>

        {/* Dati Fattura */}
        <div className="mb-6">
          <h4 className="text-md font-medium mb-3 flex items-center text-green-700">
            <FileText className="mr-2" size={16} />
            Dati Fattura
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Numero Fattura
              </label>
              <input
                type="text"
                value={fattura.numeroFattura}
                onChange={(e) =>
                  aggiornaDatiFattura("numeroFattura", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1a/2025"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Compilazione
              </label>
              <input
                type="text"
                value={fattura.dataCompilazione}
                onChange={(e) =>
                  aggiornaDatiFattura("dataCompilazione", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="01/07/2025"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantità Servizi
              </label>
              <input
                type="number"
                value={fattura.quantitaServizi}
                onChange={(e) =>
                  aggiornaDatiFattura("quantitaServizi", e.target.value)
                }
                className="w-full px-3 py-2 border text-amber-950 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="5"
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prezzo Unitario
              </label>
              <input
                type="text"
                value={fattura.prezzoUnitario}
                onChange={(e) =>
                  aggiornaDatiFattura("prezzoUnitario", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="50,00€"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrizione prestazione
            </label>
            <textarea
              value={fattura.descrizione}
              onChange={(e) =>
                aggiornaDatiFattura("descrizione", e.target.value)
              }
              style={{ minHeight: "124px" }}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 "
              placeholder="Descrizione della prestazione erogata"
            />
          </div>
        </div>

        {/* Totali (auto-calcolati) */}
        <div className="mb-6">
          <h4 className="text-md font-medium mb-3 flex items-center text-purple-700">
            <CreditCard className="mr-2" size={16} />
            Totali (auto-calcolati)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Totale Servizi
              </label>
              <input
                type="text"
                value={fattura.totaleServizi}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Totale Lordo
              </label>
              <input
                type="text"
                value={fattura.totaleLordo}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Totale Dovuto (+2€ bollo)
              </label>
              <input
                type="text"
                value={fattura.totaleDovuto}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-gray-600 font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Dati Pagamento */}
        <div>
          <h4 className="text-md font-medium mb-3 flex items-center text-orange-700">
            <MapPin className="mr-2" size={16} />
            Dati Pagamento
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Pagamento
              </label>
              <input
                type="text"
                value={fattura.dataSaldatura}
                onChange={(e) =>
                  aggiornaDatiFattura("dataSaldatura", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="01/07/2025"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pulsanti azione */}
      <div className="flex space-x-4 justify-center mb-8">
        <button
          onClick={resetFattura}
          className="px-6 py-3 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors">
          Nuova Fattura
        </button>
        <button
          onClick={generaFattura}
          disabled={isProcessing}
          className={`px-8 py-3 rounded-lg font-semibold flex items-center justify-center transition-colors ${
            isProcessing
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}>
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Generazione in corso...
            </>
          ) : (
            <>
              <Download className="mr-2" size={20} />
              Genera Fattura
            </>
          )}
        </button>
      </div>

      {/* <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h4 className="font-medium text-yellow-800 mb-2">Note importanti:</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>
            • Assicurati che il file template-fattura.docx sia presente nella
            cartella public
          </li>
          <li>
            • Il template dovrebbe contenere i campi segnaposto nel formato{" "}
            {"{NOME_PAZIENTE}"}, {"{CF_PAZIENTE}"}, ecc.
          </li>
          <li>
            • Il totale dovuto include automaticamente 2€ di marca da bollo
          </li>
          <li>
            • I codici fiscali vengono automaticamente convertiti in maiuscolo
          </li>
          <li>• Gli IBAN vengono formattati automaticamente</li>
        </ul>
      </div> */}
    </div>
  );
};
