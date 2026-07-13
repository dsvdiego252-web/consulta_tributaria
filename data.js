/*
 * Base inicial do Agente Tributário SP
 * Referência: supermercado varejista, RPA/Lucro Real, Estado de São Paulo.
 * Atualizada em 12/07/2026.
 *
 * IMPORTANTE: NCM isolada não garante tratamento tributário. A descrição legal,
 * composição, embalagem, origem/destino e condição do contribuinte também devem
 * ser avaliadas.
 */

window.TAX_APP_META = {
  version: "2026.07.12",
  updatedAt: "2026-07-12",
  context: "Supermercado varejista — RPA/Lucro Real — São Paulo",
  assumptions: [
    "Consulta voltada principalmente à auditoria de entradas e parametrização de produtos.",
    "Operações internas em São Paulo, salvo indicação diferente no resultado.",
    "Benefícios condicionados ao tipo de estabelecimento não são estendidos automaticamente ao varejo.",
    "Substituição tributária exige enquadramento simultâneo por descrição legal, NCM e CEST."
  ],
  sources: [
    {
      label: "RICMS/SP — artigos 52 a 56-C",
      url: "https://legislacao.fazenda.sp.gov.br/Paginas/art052.aspx"
    },
    {
      label: "RICMS/SP — Anexo II, artigo 3º (cesta básica)",
      url: "https://legislacao.fazenda.sp.gov.br/Paginas/an2art003.aspx"
    },
    {
      label: "RICMS/SP — Anexo II, artigo 39 (produtos alimentícios)",
      url: "https://legislacao.fazenda.sp.gov.br/Paginas/an2art039.aspx"
    },
    {
      label: "Portaria CAT 68/2019 — mercadorias sujeitas à ST",
      url: "https://legislacao.fazenda.sp.gov.br/paginas/Portaria-CAT-68-de-2019.aspx"
    },
    {
      label: "Portaria SRE 12/2026 — IVA-ST de produtos alimentícios",
      url: "https://legislacao.fazenda.sp.gov.br/Paginas/Portaria-SRE-12-de-2026.aspx"
    },
    {
      label: "Portaria SRE 64/2025 — exclusões de ST em 01/01/2026",
      url: "https://legislacao.fazenda.sp.gov.br/Paginas/Portaria-SRE-64-de-2025.aspx"
    },
    {
      label: "Portaria SRE 94/2025 — perfumaria e higiene fora da ST em 01/04/2026",
      url: "https://legislacao.fazenda.sp.gov.br/Paginas/Portaria-SRE-94-de-2025.aspx"
    },
    {
      label: "Portaria SRE 9/2026 — exclusões de ST em 01/07/2026",
      url: "https://legislacao.fazenda.sp.gov.br/Paginas/Portaria-SRE-9-de-2026.aspx"
    },
    {
      label: "Portaria SRE 20/2026 — limpeza e ração fora da ST em 01/08/2026",
      url: "https://legislacao.fazenda.sp.gov.br/Paginas/Portaria-SRE-20-de-2026.aspx"
    },
    {
      label: "Portaria SRE 34/2026 — exclusões de ST em 01/10/2026",
      url: "https://legislacao.fazenda.sp.gov.br/Paginas/Portaria-SRE-34-de-2026.aspx"
    },
    {
      label: "Tabela cBenef SP",
      url: "https://portal.fazenda.sp.gov.br/servicos/nfe/Paginas/cBenef.aspx"
    },
    {
      label: "Tabelas EFD-Contribuições — Receita Federal",
      url: "https://www.gov.br/sped/pt-br/assuntos/escrituracoes-digitais/efd-contribuicoes/tabelas-de-codigos/tabelas-utilizadas-na-apuracao-das-contribuicoes-para-o-pis-pasep-e-da-cofins"
    }
  ]
};

window.TAX_PRODUCTS = [
  {
    id: "farinha-lactea",
    name: "Farinha láctea",
    aliases: ["farinha lactea nestle", "farinha láctea nestlé", "farinha infantil"],
    ncm: "19011020",
    category: "Alimentos",
    confidence: "alta",
    summary: "Produto alimentício sujeito à substituição tributária em São Paulo quando corresponder exatamente à descrição legal de farinha láctea.",
    ncmNotes: "NCM esperada 1901.10.20. Confirmar se o produto é efetivamente farinha láctea e não outra preparação infantil.",
    icms: {
      rate: "Verificar alíquota própria e eventual benefício pela composição",
      effectiveLoad: "Não presumir apenas pela NCM",
      basis: "RICMS/SP, artigos 52 a 55 e anexos aplicáveis",
      notes: "Na auditoria da entrada, separar o ICMS próprio do fornecedor do ICMS-ST."
    },
    st: {
      periods: [
        {
          from: "2023-08-01",
          to: "2026-04-30",
          status: "sim",
          cest: "17.013.00",
          iva: "34,74%",
          source: "Portaria SRE 43/2023",
          note: "Regra histórica. A Portaria SRE 43/2023 foi revogada em 01/05/2026."
        },
        {
          from: "2026-05-01",
          to: null,
          status: "sim",
          cest: "17.013.00",
          iva: "39,69%",
          source: "Portaria SRE 12/2026, item 11",
          note: "Usar IVA-ST ajustado nas entradas interestaduais quando a alíquota interna for superior à interestadual."
        }
      ]
    },
    pisCofins: {
      status: "analisar",
      cst: "Depende do enquadramento federal específico",
      item: "—",
      basis: "Tabelas vigentes da EFD-Contribuições",
      note: "A base inicial não assume alíquota zero sem validação do item exato na tabela federal."
    },
    cbenef: {
      code: "A confirmar",
      status: "condicional",
      basis: "Tabela CST x cBenef SP vigente",
      note: "O código depende do CST e do benefício efetivamente utilizado."
    },
    warnings: ["Descrição e embalagem devem coincidir com o item legal da ST."],
    tags: ["st", "alimento", "infantil"]
  },
  {
    id: "molho-pimenta",
    name: "Molho de pimenta",
    aliases: ["molho pimenta", "tempero pimenta", "condimento de pimenta"],
    ncm: "21039021",
    category: "Alimentos",
    confidence: "alta",
    summary: "Sujeito à ST quando enquadrado como condimento ou molho da descrição legal e em embalagem imediata de até 1 kg.",
    ncmNotes: "NCM 2103.90.21. Verificar conteúdo, tipo de molho e peso da embalagem.",
    icms: {
      rate: "18% como referência geral, salvo benefício específico",
      effectiveLoad: "Pode haver redução na operação própria de fabricante/atacadista se cumprido o artigo 39",
      basis: "RICMS/SP, artigo 52; Anexo II, artigo 39",
      notes: "O benefício do artigo 39 não se estende automaticamente à saída varejista."
    },
    st: {
      periods: [
        {
          from: "2023-08-01",
          to: "2026-04-30",
          status: "sim",
          cest: "17.035.00",
          iva: "Consultar SRE 43/2023",
          source: "Portaria SRE 43/2023",
          note: "Regra histórica."
        },
        {
          from: "2026-05-01",
          to: null,
          status: "sim",
          cest: "17.035.00",
          iva: "68,98%",
          source: "Portaria SRE 12/2026, item 25",
          note: "Embalagem imediata de até 1 kg; exclui sachês individualizados de até 3 g."
        }
      ]
    },
    pisCofins: {
      status: "tributação normal a validar",
      cst: "01/02 ou correspondente à operação",
      item: "—",
      basis: "Legislação federal e EFD-Contribuições",
      note: "Não aplicar CST 06 sem enquadramento expresso."
    },
    cbenef: { code: "A confirmar", status: "condicional", basis: "Tabela cBenef SP", note: "Depende do benefício/CST adotado." },
    warnings: ["ST depende também do limite de embalagem."],
    tags: ["st", "molho", "condimento"]
  },
  {
    id: "molho-soja",
    name: "Molho de soja preparado",
    aliases: ["shoyu", "molho shoyu", "hinomoto", "molho de soja"],
    ncm: "21031010",
    category: "Alimentos",
    confidence: "alta",
    summary: "Sujeito à ST quando for molho de soja preparado em embalagem imediata de até 650 g.",
    ncmNotes: "NCM 2103.10.10. Não confundir com outras preparações ou condimentos.",
    icms: {
      rate: "18% como referência geral, salvo benefício específico",
      effectiveLoad: "Avaliar artigo 39 para fabricante/atacadista",
      basis: "RICMS/SP, artigo 52; Anexo II, artigo 39",
      notes: "A saída varejista não herda automaticamente o benefício concedido ao fabricante ou atacadista."
    },
    st: {
      periods: [
        { from: "2023-08-01", to: "2026-04-30", status: "sim", cest: "17.036.00", iva: "Consultar SRE 43/2023", source: "Portaria SRE 43/2023", note: "Regra histórica." },
        { from: "2026-05-01", to: null, status: "sim", cest: "17.036.00", iva: "83,64%", source: "Portaria SRE 12/2026, item 26", note: "Embalagem imediata de até 650 g; exclui sachês individualizados de até 10 g." }
      ]
    },
    pisCofins: { status: "tributação normal a validar", cst: "Conforme operação", item: "—", basis: "EFD-Contribuições", note: "Validar regime federal do produto." },
    cbenef: { code: "A confirmar", status: "condicional", basis: "Tabela cBenef SP", note: "Depende do CST e do benefício." },
    warnings: ["Peso e apresentação comercial alteram o enquadramento na ST."],
    tags: ["st", "molho", "shoyu"]
  },
  {
    id: "ketchup",
    name: "Ketchup",
    aliases: ["catchup", "catchupe", "molho ketchup"],
    ncm: "21032010",
    category: "Alimentos",
    confidence: "alta",
    summary: "Sujeito à ST nas embalagens imediatas de até 650 g, observadas as exclusões de sachês.",
    ncmNotes: "NCM 2103.20.10. Esta mesma NCM também pode aparecer em molho de tomate, com item e IVA diferentes conforme descrição e embalagem.",
    icms: { rate: "18% como referência geral", effectiveLoad: "Avaliar benefício apenas quando atendidas as condições legais", basis: "RICMS/SP e Anexo II", notes: "Descrição comercial é indispensável." },
    st: {
      periods: [
        { from: "2026-05-01", to: null, status: "sim", cest: "17.034.00", iva: "66,34%", source: "Portaria SRE 12/2026, item 24", note: "Embalagem até 650 g; exclui sachês individualizados de até 10 g." }
      ]
    },
    pisCofins: { status: "analisar", cst: "Conforme enquadramento", item: "—", basis: "EFD-Contribuições", note: "Sem presunção automática de alíquota zero." },
    cbenef: { code: "A confirmar", status: "condicional", basis: "Tabela cBenef SP", note: "Conferir CST e benefício." },
    warnings: ["A NCM sozinha não diferencia ketchup de todos os molhos de tomate."],
    tags: ["st", "molho"]
  },
  {
    id: "maionese",
    name: "Maionese",
    aliases: ["molho maionese"],
    ncm: "21039011",
    category: "Alimentos",
    confidence: "alta",
    summary: "Sujeita à ST em embalagem imediata de até 650 g, ressalvada a exclusão dos sachês pequenos.",
    ncmNotes: "NCM 2103.90.11.",
    icms: { rate: "18% como referência geral", effectiveLoad: "Avaliar benefício conforme origem da operação", basis: "RICMS/SP", notes: "Não transferir automaticamente benefício do fornecedor para o varejo." },
    st: { periods: [{ from: "2026-05-01", to: null, status: "sim", cest: "17.039.00", iva: "44,16%", source: "Portaria SRE 12/2026, item 29", note: "Embalagem até 650 g; exclui sachês individualizados de até 10 g." }] },
    pisCofins: { status: "analisar", cst: "Conforme operação", item: "—", basis: "EFD-Contribuições", note: "Validar legislação federal vigente." },
    cbenef: { code: "A confirmar", status: "condicional", basis: "Tabela cBenef SP", note: "Conferir CST." },
    warnings: [],
    tags: ["st", "molho"]
  },
  {
    id: "macarrao-instantaneo",
    name: "Macarrão instantâneo derivado de farinha de trigo",
    aliases: ["miojo", "massa instantanea", "macarrão instantâneo"],
    ncm: "19023000",
    category: "Alimentos",
    confidence: "alta",
    summary: "Sujeito à ST. O IVA muda conforme a massa instantânea seja ou não derivada de farinha de trigo.",
    ncmNotes: "NCM 1902.30.00. Confirmar composição para escolher entre os CEST 17.047.00 e 17.047.01.",
    icms: { rate: "12% ou regra específica conforme produto", effectiveLoad: "Pode haver redução de base conforme condições", basis: "RICMS/SP, artigo 54 e Anexo II", notes: "A composição e o tipo de massa são decisivos." },
    st: { periods: [{ from: "2026-05-01", to: null, status: "sim", cest: "17.047.01", iva: "74,21%", source: "Portaria SRE 12/2026, item 32.1", note: "Para massa instantânea derivada de farinha de trigo. Outras massas instantâneas: IVA 84,25%, CEST 17.047.00." }] },
    pisCofins: { status: "analisar", cst: "Conforme operação", item: "—", basis: "EFD-Contribuições", note: "Verificar eventual redução/zero conforme legislação federal vigente." },
    cbenef: { code: "A confirmar", status: "condicional", basis: "Tabela cBenef SP", note: "Depende do benefício aplicado." },
    warnings: ["Não confundir com massa seca comum, que possui tratamento diferente."],
    tags: ["st", "massa", "macarrao"]
  },
  {
    id: "macarrao-seco",
    name: "Macarrão seco comum",
    aliases: ["macarrão basilar", "massa seca", "espaguete", "penne"],
    ncm: "19021900",
    category: "Alimentos",
    confidence: "média",
    summary: "Em regra, não se enquadra nos itens de ST da Portaria SRE 12/2026 destinados a massa instantânea, cozida ou recheada. Pode ter alíquota de 12% e redução de base da cesta básica, conforme requisitos.",
    ncmNotes: "NCM usual 1902.19.00 para outras massas alimentícias não cozidas, nem recheadas, nem preparadas de outro modo. Confirmar composição.",
    icms: {
      rate: "12%",
      effectiveLoad: "7% quando atendidos os requisitos do artigo 3º do Anexo II",
      basis: "RICMS/SP, artigo 54, XIX; Anexo II, artigo 3º, XIX",
      notes: "A redução possui condições e regras de crédito. Validar a redação vigente e o tipo exato da massa."
    },
    st: { periods: [{ from: "2026-05-01", to: null, status: "não", cest: "—", iva: "—", source: "Portaria CAT 68/2019 e SRE 12/2026", note: "A base inicial considera massa seca comum fora dos itens ativos de ST; confirmar a descrição exata." }] },
    pisCofins: { status: "analisar", cst: "Conforme legislação federal", item: "—", basis: "EFD-Contribuições", note: "Validar se o produto está abrangido por alíquota zero na data da operação." },
    cbenef: { code: "A confirmar", status: "provável quando usada a redução", basis: "Tabela cBenef SP", note: "Selecionar o código correspondente ao CST e ao artigo 3º do Anexo II." },
    warnings: ["Resultado depende da composição e da apresentação da massa."],
    tags: ["massa", "cesta-basica", "reducao"]
  },
  {
    id: "cafe-torrado",
    name: "Café torrado, em grão ou moído",
    aliases: ["café torrado", "cafe moido", "café em pó", "cafe em grao"],
    ncm: "09012100",
    category: "Alimentos",
    confidence: "alta",
    summary: "Desde 01/01/2026, o café dos itens revogados do Anexo XVI deixou a ST em São Paulo. A operação própria interna pode estar sujeita à alíquota de 7%.",
    ncmNotes: "NCM 0901.21.00 para café torrado não descafeinado. Confirmar se é em grão/moído e se não é preparação solúvel.",
    icms: {
      rate: "7%",
      effectiveLoad: "7%",
      basis: "RICMS/SP, artigo 53-A, quando atendida a descrição legal",
      notes: "Não confundir com preparados à base de café ou café solúvel."
    },
    st: {
      periods: [
        { from: "2023-08-01", to: "2025-12-31", status: "sim", cest: "17.096.00 ou correspondente à descrição", iva: "Regra histórica", source: "Portaria CAT 68/2019 / SRE 43/2023", note: "Tratamento anterior à exclusão." },
        { from: "2026-01-01", to: null, status: "não", cest: "—", iva: "—", source: "Portaria SRE 64/2025", note: "Itens 88 a 115 do Anexo XVI foram revogados, abrangendo o grupo em que estava o café." }
      ]
    },
    pisCofins: {
      status: "alíquota zero",
      cst: "06",
      item: "124",
      basis: "Tabela 4.3.13 da EFD-Contribuições",
      note: "Abrange café classificado nos códigos 09.01 e 2101.1 da TIPI, conforme a tabela federal vigente."
    },
    cbenef: { code: "A confirmar", status: "condicional", basis: "Tabela cBenef SP", note: "Conferir o código vinculado ao CST e à alíquota de 7%." },
    warnings: ["A exclusão da ST não elimina a necessidade de tratar o estoque existente conforme Portaria CAT 28/2020."],
    tags: ["cafe", "sem-st", "aliquota-zero"]
  },
  {
    id: "azeite-oliva",
    name: "Azeite de oliva",
    aliases: ["azeite 500ml", "azeite extra virgem", "óleo de oliva"],
    ncm: "15092000",
    category: "Alimentos",
    confidence: "média",
    summary: "O azeite que estava em item do Anexo XVI deixou a ST em São Paulo a partir de 01/01/2026. A classificação exata deve considerar o tipo e o grau de processamento.",
    ncmNotes: "A NCM pode variar conforme categoria do azeite. Para o produto consultado no projeto foi usada 1509.20.00; confirmar a NCM vigente do item.",
    icms: { rate: "Verificar conforme classificação e benefício", effectiveLoad: "Não presumir", basis: "RICMS/SP", notes: "A base inicial não fixa alíquota sem validar a classificação atual do azeite." },
    st: {
      periods: [
        { from: "2023-08-01", to: "2025-12-31", status: "sim", cest: "17.064.00 ou item correspondente", iva: "36,50% (histórico do projeto)", source: "Portaria CAT 68/2019 / SRE 43/2023", note: "Regra histórica." },
        { from: "2026-01-01", to: null, status: "não", cest: "—", iva: "—", source: "Portaria SRE 64/2025", note: "Os itens 61 a 71 do Anexo XVI foram revogados." }
      ]
    },
    pisCofins: { status: "analisar", cst: "Conforme legislação federal", item: "—", basis: "EFD-Contribuições", note: "Validar a incidência federal vigente pelo NCM exato." },
    cbenef: { code: "A confirmar", status: "condicional", basis: "Tabela cBenef SP", note: "Depende do tratamento efetivamente aplicado." },
    warnings: ["Revisar NCM conforme a descrição comercial e a TIPI vigente."],
    tags: ["azeite", "sem-st", "oleo"]
  },
  {
    id: "creme-dental",
    name: "Creme dental",
    aliases: ["pasta de dente", "dentifricio", "colgate", "creme dental colgate"],
    ncm: "33061000",
    category: "Higiene pessoal",
    confidence: "alta",
    summary: "Produtos de perfumaria e higiene pessoal deixaram a ST paulista em 01/04/2026. Para PIS/COFINS, validar o tratamento federal monofásico/alíquota zero aplicável à revenda.",
    ncmNotes: "NCM 3306.10.00 para dentifrícios.",
    icms: { rate: "18% como referência geral", effectiveLoad: "18%, salvo benefício específico", basis: "RICMS/SP, artigo 52", notes: "Após a exclusão da ST, destacar/tratar o ICMS próprio normalmente na cadeia, conforme a operação." },
    st: {
      periods: [
        { from: "2025-09-01", to: "2026-03-31", status: "sim", cest: "20.012.00 ou item correspondente", iva: "36,90% (histórico do projeto)", source: "Portaria SRE 48/2025", note: "Regra histórica, revogada." },
        { from: "2026-04-01", to: null, status: "não", cest: "—", iva: "—", source: "Portaria SRE 94/2025", note: "O Anexo XI da Portaria CAT 68/2019 e a Portaria SRE 48/2025 foram revogados." }
      ]
    },
    pisCofins: { status: "revenda com tratamento concentrado/zero a validar", cst: "04 ou 06 conforme escrituração adotada e hipótese legal", item: "129 (referência do projeto; validar na tabela vigente)", basis: "Lei federal aplicável e EFD-Contribuições", note: "Confirmar o CST usado pelo sistema e a versão vigente da tabela antes de parametrizar." },
    cbenef: { code: "Sem código automático", status: "analisar", basis: "Tabela cBenef SP", note: "A saída sem benefício de ICMS não deve receber código de benefício por mera exclusão da ST." },
    warnings: ["Exclusão da ST exigiu tratamento de estoque conforme Portaria CAT 28/2020."],
    tags: ["higiene", "sem-st", "pis-monofasico"]
  },
  {
    id: "fio-dental",
    name: "Fio dental",
    aliases: ["fita dental"],
    ncm: "33062000",
    category: "Higiene pessoal",
    confidence: "alta",
    summary: "Fora da ST paulista desde 01/04/2026, em razão da revogação do Anexo XI da Portaria CAT 68/2019.",
    ncmNotes: "NCM 3306.20.00.",
    icms: { rate: "18% como referência geral", effectiveLoad: "18%, salvo benefício", basis: "RICMS/SP, artigo 52", notes: "Aplicar ICMS próprio conforme a operação após a exclusão da ST." },
    st: {
      periods: [
        { from: "2025-09-01", to: "2026-03-31", status: "sim", cest: "20.013.00 ou correspondente", iva: "73,44% (histórico do projeto)", source: "Portaria SRE 48/2025", note: "Regra histórica." },
        { from: "2026-04-01", to: null, status: "não", cest: "—", iva: "—", source: "Portaria SRE 94/2025", note: "Perfumaria e higiene pessoal excluídas da ST." }
      ]
    },
    pisCofins: { status: "analisar", cst: "Conforme regime federal", item: "—", basis: "EFD-Contribuições", note: "Não replicar automaticamente o tratamento do creme dental sem verificar a hipótese legal." },
    cbenef: { code: "Sem código automático", status: "analisar", basis: "Tabela cBenef SP", note: "Depende de benefício de ICMS, não da ST." },
    warnings: [],
    tags: ["higiene", "sem-st"]
  },
  {
    id: "enxaguante-bucal",
    name: "Enxaguante bucal",
    aliases: ["antisseptico bucal", "enxaguatório bucal"],
    ncm: "33069000",
    category: "Higiene pessoal",
    confidence: "alta",
    summary: "Fora da ST paulista desde 01/04/2026. A alíquota interna não deve ser reduzida apenas por estar no capítulo 33.",
    ncmNotes: "NCM 3306.90.00 para outras preparações para higiene bucal ou dentária.",
    icms: { rate: "18% como referência geral", effectiveLoad: "18%, salvo benefício", basis: "RICMS/SP, artigo 52", notes: "Não se enquadra automaticamente no artigo 54." },
    st: {
      periods: [
        { from: "2025-09-01", to: "2026-03-31", status: "sim", cest: "Conforme item do antigo Anexo XI", iva: "Conforme SRE 48/2025", source: "Portaria SRE 48/2025", note: "Regra histórica." },
        { from: "2026-04-01", to: null, status: "não", cest: "—", iva: "—", source: "Portaria SRE 94/2025", note: "Exclusão da ST para perfumaria e higiene pessoal." }
      ]
    },
    pisCofins: { status: "analisar", cst: "Conforme regime federal", item: "—", basis: "EFD-Contribuições", note: "Validar o tratamento monofásico/alíquota zero conforme produto e operação." },
    cbenef: { code: "Sem código automático", status: "analisar", basis: "Tabela cBenef SP", note: "Somente preencher quando houver benefício de ICMS aplicável." },
    warnings: [],
    tags: ["higiene", "sem-st"]
  },
  {
    id: "uva-passa",
    name: "Uva passa",
    aliases: ["uva passa 10kg", "passas de uva", "uva seca"],
    ncm: "08062000",
    category: "Frutas e hortifrúti",
    confidence: "média",
    summary: "Produto do capítulo 08. O artigo 39 do Anexo II pode reduzir a carga a 12% nas saídas internas promovidas por fabricante ou atacadista, mas não se aplica automaticamente à saída do supermercado varejista.",
    ncmNotes: "NCM 0806.20.00 para uvas secas. Confirmar se o produto não contém preparação adicional que altere a classificação.",
    icms: { rate: "18% como regra geral para a saída varejista, salvo benefício específico", effectiveLoad: "12% no artigo 39 somente quando atendidas as condições e o tipo de estabelecimento", basis: "RICMS/SP, artigo 52; Anexo II, artigo 39, IV", notes: "O benefício pode justificar a nota do fornecedor fabricante/atacadista, mas não deve ser copiado automaticamente para o varejo." },
    st: { periods: [{ from: "2026-01-01", to: null, status: "não", cest: "—", iva: "—", source: "Portaria CAT 68/2019 vigente", note: "Não identificada na base inicial entre os itens ativos de ST." }] },
    pisCofins: { status: "analisar", cst: "Conforme legislação federal", item: "—", basis: "EFD-Contribuições", note: "Validar eventual alíquota zero pelo produto exato." },
    cbenef: { code: "A confirmar", status: "condicional", basis: "Tabela cBenef SP", note: "Se o fornecedor utilizar a redução do artigo 39, selecionar o código correspondente ao CST." },
    warnings: ["Artigo 39 é condicionado ao estabelecimento fabricante ou atacadista."],
    tags: ["fruta", "art39", "reducao"]
  },
  {
    id: "maca-gala",
    name: "Maçã gala fresca",
    aliases: ["maca gala", "maçã kg", "maca fresca"],
    ncm: "08081000",
    category: "Frutas e hortifrúti",
    confidence: "média",
    summary: "Fruta fresca. Deve ser verificada prioritariamente a hipótese de isenção aplicável a frutas em estado natural, antes de usar a redução do artigo 39.",
    ncmNotes: "NCM 0808.10.00 para maçãs frescas.",
    icms: { rate: "Isenção a confirmar pela condição do produto", effectiveLoad: "0% quando abrangida pela isenção vigente", basis: "Anexo I do RICMS/SP — frutas em estado natural", notes: "Confirmar apresentação, conservação e se houve industrialização que descaracterize o estado natural." },
    st: { periods: [{ from: "2026-01-01", to: null, status: "não", cest: "—", iva: "—", source: "Portaria CAT 68/2019", note: "Produto não identificado na base inicial como sujeito à ST." }] },
    pisCofins: { status: "alíquota zero provável", cst: "06 a confirmar", item: "A confirmar", basis: "Tabela 4.3.13", note: "Validar o item federal vigente para fruta fresca." },
    cbenef: { code: "A confirmar", status: "necessário se usada isenção", basis: "Tabela cBenef SP", note: "Selecionar o código da isenção correspondente ao CST da operação." },
    warnings: ["Resultado preliminar: validar o artigo exato da isenção antes de parametrizar."],
    tags: ["fruta", "isencao", "hortifruti"]
  },
  {
    id: "polpa-fruta",
    name: "Polpa de fruta congelada",
    aliases: ["polpa congelada", "polpa de fruta", "polpa natural"],
    ncm: "08119090",
    alternativeNcms: ["20089900"],
    category: "Frutas e hortifrúti",
    confidence: "baixa",
    summary: "A classificação depende do processo industrial e da composição. Pode permanecer no capítulo 08 ou migrar para o capítulo 20; essa decisão altera benefícios, ST e PIS/COFINS.",
    ncmNotes: "0811.90.90 quando fruta congelada sem preparação que a leve ao capítulo 20; 2008.99.00 pode ser aplicável a preparações/conservas. Exigir ficha técnica.",
    icms: { rate: "Depende da NCM e da operação", effectiveLoad: "Pode haver diferimento ou redução em hipótese específica", basis: "RICMS/SP, inclusive artigo 350 quando preenchidos os requisitos", notes: "Não parametrizar sem ficha técnica, ingredientes, Brix, açúcar adicionado e processo produtivo." },
    st: { periods: [{ from: "2026-01-01", to: null, status: "analisar", cest: "—", iva: "—", source: "Portaria CAT 68/2019", note: "Consultar pela NCM final e pela descrição legal após definir a classificação." }] },
    pisCofins: { status: "analisar", cst: "Conforme NCM final", item: "A confirmar", basis: "Tabela 4.3.13", note: "O item federal muda conforme a classificação e a composição." },
    cbenef: { code: "A confirmar", status: "condicional", basis: "Tabela cBenef SP", note: "Depende do benefício efetivamente identificado." },
    warnings: ["Classificação fiscal sensível: solicitar laudo/ficha técnica do fabricante."],
    tags: ["fruta", "ncm-duvidosa", "congelado"]
  },
  {
    id: "baralho",
    name: "Baralho",
    aliases: ["cartas de jogar", "jogo de cartas"],
    ncm: "95044000",
    category: "Bazar",
    confidence: "média",
    summary: "No protocolo do projeto, o baralho foi tratado com alíquota interna de 25%, e não com a alíquota geral de 18%.",
    ncmNotes: "NCM 9504.40.00. Confirmar se o produto é conjunto de cartas de jogar.",
    icms: { rate: "25%", effectiveLoad: "25%", basis: "RICMS/SP, artigo 55, conforme enquadramento adotado no projeto", notes: "Validar a redação vigente do item do artigo 55 antes de corrigir em massa." },
    st: { periods: [{ from: "2026-01-01", to: null, status: "não", cest: "—", iva: "—", source: "Portaria CAT 68/2019", note: "Não identificado na base inicial como ST." }] },
    pisCofins: { status: "tributação normal", cst: "01/02 conforme operação", item: "—", basis: "EFD-Contribuições", note: "Sem benefício federal identificado na base inicial." },
    cbenef: { code: "Não aplicável em regra", status: "sem benefício", basis: "Tabela cBenef SP", note: "Não preencher código de benefício quando a operação for integralmente tributada sem benefício." },
    warnings: ["Registro baseado no protocolo interno do projeto; validar a base legal antes de alteração definitiva."],
    tags: ["bazar", "25"]
  },
  {
    id: "cadeado",
    name: "Cadeado",
    aliases: ["cadeado metal", "trava cadeado"],
    ncm: "83011000",
    category: "Bazar",
    confidence: "média",
    summary: "Tratamento padrão indicado no projeto: tributação normal, sem ST, quando o produto for cadeado da NCM 8301.10.00.",
    ncmNotes: "NCM 8301.10.00.",
    icms: { rate: "18%", effectiveLoad: "18%", basis: "RICMS/SP, artigo 52", notes: "Não aceitar ST do fornecedor sem localizar enquadramento simultâneo por descrição, NCM e CEST." },
    st: { periods: [{ from: "2026-01-01", to: null, status: "não", cest: "—", iva: "—", source: "Portaria CAT 68/2019 vigente", note: "Não identificado na base inicial entre os itens ativos de ST." }] },
    pisCofins: { status: "tributação normal", cst: "01/02 conforme operação", item: "—", basis: "EFD-Contribuições", note: "Sem tratamento especial identificado." },
    cbenef: { code: "Não aplicável em regra", status: "sem benefício", basis: "Tabela cBenef SP", note: "Operação integralmente tributada." },
    warnings: [],
    tags: ["bazar", "sem-st"]
  },
  {
    id: "fita-isolante",
    name: "Fita isolante autoadesiva de plástico",
    aliases: ["fita isolante", "fita eletrica", "fita adesiva isolante"],
    ncm: "39191020",
    alternativeNcms: ["59061000"],
    category: "Materiais elétricos",
    confidence: "média",
    summary: "A NCM esperada no projeto é 3919.10.20, em vez de 5906.10.00. A ST permanece relevante até 30/09/2026 e é excluída a partir de 01/10/2026 para o grupo revogado pela Portaria SRE 34/2026.",
    ncmNotes: "Comparar material, suporte, largura e composição. A divergência 5906.10.00 x 3919.10.20 deve ser sustentada por ficha técnica.",
    icms: { rate: "18%", effectiveLoad: "18%, salvo regra específica", basis: "RICMS/SP, artigo 52", notes: "Após a exclusão da ST, a cadeia volta à tributação própria normal, observadas as regras de estoque." },
    st: {
      periods: [
        { from: "2024-01-01", to: "2026-09-30", status: "sim", cest: "Conferir item do Anexo XXI", iva: "84% (referência histórica do projeto; validar portaria vigente)", source: "Portaria CAT 68/2019, Anexo XXI; Portaria SRE 86/2024", note: "Confirmar descrição e item antes de calcular." },
        { from: "2026-10-01", to: null, status: "não", cest: "—", iva: "—", source: "Portaria SRE 34/2026", note: "O Anexo XXI e a Portaria SRE 86/2024 são revogados a partir desta data." }
      ]
    },
    pisCofins: { status: "tributação normal", cst: "01/02 conforme operação", item: "—", basis: "EFD-Contribuições", note: "Sem benefício federal identificado." },
    cbenef: { code: "Não aplicável em regra", status: "sem benefício", basis: "Tabela cBenef SP", note: "A mera existência ou exclusão da ST não gera cBenef." },
    warnings: ["Há mudança programada para 01/10/2026.", "MVA histórico deve ser confirmado na portaria vigente antes do cálculo."],
    tags: ["st", "mudanca-futura", "ncm-divergente"]
  },
  {
    id: "detergente-liquido",
    name: "Detergente líquido para limpeza",
    aliases: ["detergente", "lava louças", "lava louca", "produto de limpeza"],
    ncm: "34025000",
    category: "Limpeza",
    confidence: "média",
    summary: "O grupo de produtos de limpeza permanece em ST até 31/07/2026 e é excluído do regime em São Paulo a partir de 01/08/2026.",
    ncmNotes: "A NCM de preparações para limpeza varia conforme composição e apresentação. Confirmar a classificação exata.",
    icms: { rate: "18% como referência geral", effectiveLoad: "18%, salvo benefício específico", basis: "RICMS/SP, artigo 52", notes: "A partir da exclusão da ST, tratar o ICMS próprio normalmente." },
    st: {
      periods: [
        { from: "2025-10-01", to: "2026-07-31", status: "sim", cest: "Conforme Anexo XIII", iva: "Conforme Portaria SRE 55/2025", source: "Portaria SRE 55/2025", note: "Confirmar item, NCM, descrição e IVA na portaria." },
        { from: "2026-08-01", to: null, status: "não", cest: "—", iva: "—", source: "Portaria SRE 20/2026", note: "Anexos XII e XIII e portarias de ração/limpeza/alvejantes são revogados." }
      ]
    },
    pisCofins: { status: "tributação normal a validar", cst: "01/02 conforme operação", item: "—", basis: "EFD-Contribuições", note: "Verificar eventual regime monofásico específico, se houver." },
    cbenef: { code: "Não automático", status: "analisar", basis: "Tabela cBenef SP", note: "Exclusão da ST não equivale a benefício fiscal." },
    warnings: ["Mudança em vigor em 01/08/2026.", "Estoque deve seguir a Portaria CAT 28/2020."],
    tags: ["limpeza", "st", "mudanca-futura"]
  },
  {
    id: "agua-sanitaria",
    name: "Água sanitária / alvejante",
    aliases: ["agua sanitaria", "alvejante", "branqueador", "cloro"],
    ncm: "28289011",
    category: "Limpeza",
    confidence: "média",
    summary: "Sujeita à ST até 31/07/2026 conforme descrição e item. Excluída da ST paulista a partir de 01/08/2026.",
    ncmNotes: "A NCM varia conforme composição e teor. Confirmar laudo ou ficha técnica.",
    icms: { rate: "18% como referência geral", effectiveLoad: "18%, salvo regra específica", basis: "RICMS/SP, artigo 52", notes: "Após 01/08/2026, tratar a tributação própria e o estoque de transição." },
    st: {
      periods: [
        { from: "2025-10-01", to: "2026-07-31", status: "sim", cest: "Conforme Anexo XIII", iva: "Conforme Portaria SRE 57/2025", source: "Portaria SRE 57/2025", note: "Confirmar item exato." },
        { from: "2026-08-01", to: null, status: "não", cest: "—", iva: "—", source: "Portaria SRE 20/2026", note: "Revogação do grupo de água sanitária, branqueadores e alvejantes." }
      ]
    },
    pisCofins: { status: "tributação normal a validar", cst: "Conforme operação", item: "—", basis: "EFD-Contribuições", note: "Validar produto exato." },
    cbenef: { code: "Não automático", status: "analisar", basis: "Tabela cBenef SP", note: "A exclusão da ST não gera cBenef." },
    warnings: ["Mudança em 01/08/2026.", "Classificação depende da composição química."],
    tags: ["limpeza", "st", "mudanca-futura"]
  },
  {
    id: "racao-pet",
    name: "Ração tipo pet para animais domésticos",
    aliases: ["racao cachorro", "ração gato", "ração pet", "alimento para cães"],
    ncm: "23091000",
    category: "Pet",
    confidence: "média",
    summary: "Permanece em ST até 31/07/2026 e sai da ST paulista em 01/08/2026.",
    ncmNotes: "NCM 2309.10.00 para alimentos para cães ou gatos, acondicionados para venda a retalho. Confirmar espécie e apresentação.",
    icms: { rate: "18% como referência geral", effectiveLoad: "Pode haver benefício/diferimento em hipóteses agropecuárias específicas, que não se aplicam automaticamente à ração pet varejista", basis: "RICMS/SP", notes: "Não confundir ração pet com insumos destinados à produção agropecuária." },
    st: {
      periods: [
        { from: "2025-09-01", to: "2026-07-31", status: "sim", cest: "22.001.00 ou correspondente", iva: "Conforme Portaria SRE 46/2025", source: "Portaria SRE 46/2025", note: "Confirmar item exato." },
        { from: "2026-08-01", to: null, status: "não", cest: "—", iva: "—", source: "Portaria SRE 20/2026", note: "O Anexo XII e a Portaria SRE 46/2025 são revogados." }
      ]
    },
    pisCofins: { status: "analisar", cst: "Conforme legislação federal", item: "—", basis: "EFD-Contribuições", note: "Validar tratamento da ração pet específica." },
    cbenef: { code: "A confirmar", status: "condicional", basis: "Tabela cBenef SP", note: "Não usar código de insumo agropecuário sem preencher todos os requisitos." },
    warnings: ["Mudança em 01/08/2026.", "Estoque de transição segue Portaria CAT 28/2020."],
    tags: ["pet", "st", "mudanca-futura"]
  },
  {
    id: "askov",
    name: "Bebida alcoólica destilada (ex.: Askov)",
    aliases: ["askov", "vodka", "bebida destilada", "bebida alcoolica"],
    ncm: "22089000",
    category: "Bebidas",
    confidence: "média",
    summary: "No projeto, bebidas alcoólicas destiladas da NCM 2208.90.00 foram tratadas com alíquota interna de 25%. A ST e a pauta devem ser consultadas na norma vigente de bebidas para a data e o produto.",
    ncmNotes: "NCM 2208.90.00 é residual. Confirmar tipo, teor alcoólico e descrição específica.",
    icms: { rate: "25%", effectiveLoad: "25%", basis: "RICMS/SP, artigo 55, II", notes: "A tributação de bebidas também pode envolver pauta/PMPF e regras específicas de ST." },
    st: { periods: [{ from: "2026-01-01", to: null, status: "analisar", cest: "Conforme bebida", iva: "Pauta/IVA vigente", source: "Portaria de bebidas vigente na data", note: "A base não fixa pauta porque os valores são atualizados periodicamente." }] },
    pisCofins: { status: "regime específico", cst: "Conforme operação", item: "—", basis: "Legislação federal de bebidas", note: "Validar regime concentrado/monofásico aplicável." },
    cbenef: { code: "Não aplicável em regra", status: "sem benefício", basis: "Tabela cBenef SP", note: "Salvo hipótese específica." },
    warnings: ["Consultar a pauta de bebidas vigente na data da operação."],
    tags: ["bebida", "25", "pauta"]
  }
];

window.GENERIC_RULES = [
  {
    id: "chapter-08",
    test: ncm => ncm.startsWith("08"),
    title: "Capítulo 08 — frutas e frutos",
    message: "Verifique primeiro se o produto é fruta fresca em estado natural (possível isenção). Para produtos secos ou processados, o artigo 39 do Anexo II pode explicar carga de 12% em saída de fabricante/atacadista, mas não se estende automaticamente ao varejo."
  },
  {
    id: "chapter-33",
    test: ncm => /^33(03|04|05|06|07)/.test(ncm),
    title: "Perfumaria e higiene pessoal",
    message: "O grupo deixou a substituição tributária paulista em 01/04/2026 pela Portaria SRE 94/2025. Ainda é necessário analisar ICMS próprio, PIS/COFINS monofásico e estoque de transição."
  },
  {
    id: "food-st",
    test: ncm => /^(16|17|18|19|20|21)/.test(ncm),
    title: "Possível produto alimentício sujeito à ST",
    message: "Compare simultaneamente NCM, descrição, CEST, embalagem e exceções do Anexo XVI da Portaria CAT 68/2019 e do Anexo Único da Portaria SRE 12/2026. A NCM isolada não confirma ST."
  },
  {
    id: "cleaning",
    test: ncm => /^(2828|3402|3405|3808)/.test(ncm),
    title: "Possível produto de limpeza",
    message: "Considere a mudança temporal: ST até 31/07/2026, com exclusão do grupo a partir de 01/08/2026 pela Portaria SRE 20/2026, conforme o item e a descrição legal."
  },
  {
    id: "pet",
    test: ncm => ncm.startsWith("2309"),
    title: "Possível ração animal",
    message: "Diferencie ração pet de insumo agropecuário. A ração pet sai da ST paulista em 01/08/2026 pela Portaria SRE 20/2026."
  },
  {
    id: "electrical-future",
    test: ncm => /^(3919|8507|8536|8544)/.test(ncm),
    title: "Materiais elétricos — mudança em 01/10/2026",
    message: "A Portaria SRE 34/2026 revoga o Anexo XXI e normas relacionadas a partir de 01/10/2026. Para datas anteriores, confira o item vigente e o IVA correspondente."
  }
];
