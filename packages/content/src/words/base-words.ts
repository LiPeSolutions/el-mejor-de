/**
 * Curated 7-letter words a daily Siete Letras set was built from (until
 * 3/10/2026): common, family-friendly and, when possible, with a local flavor.
 * Each one must be in the dictionary and have enough shorter words (checked by
 * the tests). Changing this list changes those days' letters.
 */
export const BASE_WORDS: readonly string[] = [
  // Animales
  'ardilla', 'ballena', 'burrito', 'caballo', 'cabrito', 'calamar', 'camarón', 'camello',
  'canario', 'canguro', 'caracol', 'chancho', 'cigarra', 'conejos', 'cordero', 'gallina', 'gallito',
  'gaviota', 'gorilas', 'gorrión', 'grillos', 'guanaco', 'hormiga', 'hornero', 'jirafas',
  'lechuza', 'mapache', 'medusas', 'mulitas', 'palomas', 'pantera', 'perrito', 'pollito',
  'sardina', 'ternero', 'tiburón', 'tigresa', 'tortuga', 'tucanes', 'yacarés', 'zorrino',
  // Comidas
  'alfajor', 'bananas', 'batatas', 'cebolla', 'cerezas', 'choclos', 'chorizo', 'churros',
  'ciruela', 'durazno', 'factura', 'galleta', 'helados', 'lechuga', 'lenteja', 'limones', 'manteca',
  'manzana', 'melones', 'naranja', 'panchos', 'pepinos', 'polenta', 'pomelos', 'postres', 'quesito',
  'sandías', 'tomates', 'tortita', 'tostada', 'zapallo',
  // Naturaleza y tiempo
  'árboles', 'arroyos', 'azucena', 'bosques', 'cascada', 'cometas', 'galaxia', 'girasol', 'glaciar',
  'lagunas', 'lapacho', 'luceros', 'maderas', 'mañanas', 'montaña', 'nublado', 'palmera',
  'piedras', 'planeta', 'pradera', 'rosales', 'semanas', 'semilla', 'troncos', 'truenos',
  'veranos', 'vientos',
  // Lugares
  'almacén', 'avenida', 'barrios', 'cabañas', 'caminos', 'capilla', 'chacras', 'colegio', 'escuela',
  'esquina', 'estadio', 'fogatas', 'granero', 'granjas', 'iglesia', 'mercado', 'molinos',
  'palacio', 'puentes', 'pueblos', 'puertos', 'teatros', 'veredas', 'vecinos',
  // Cosas de la casa y la ropa
  'anillos', 'armario', 'botella', 'bufanda', 'cajones', 'campera', 'camisas', 'canasta', 'candado',
  'cartera', 'colchón', 'cortina', 'cuchara', 'espejos', 'estante', 'frazada', 'guantes',
  'lámpara', 'llavero', 'maletas', 'mochila', 'muebles', 'muñecas', 'patines',
  'pollera', 'ponchos', 'puertas', 'pulsera', 'relojes', 'remeras', 'sábanas', 'tenedor', 'trompos',
  'velador', 'ventana', 'zapatos', 'hamacas', 'tobogán',
  // Escuela, cultura y fiestas
  'actores', 'alumnos', 'aplauso', 'carpeta', 'cartero', 'ciencia', 'colores', 'correos',
  'cuentos', 'cumbias', 'desfile', 'dibujos', 'disfraz', 'escenas', 'fiestas', 'lápices', 'lectura',
  'maestra', 'maestro', 'mensaje', 'milonga', 'murales', 'músicas', 'noticia', 'novelas', 'números',
  'palabra', 'payador', 'payasos', 'pintura', 'pizarra', 'recreos', 'revista', 'títeres', 'canción',
  // Deportes y juegos
  'ajedrez', 'arquero', 'atletas', 'bandera', 'barajas', 'campeón', 'canchas', 'carrera', 'coronas',
  'defensa', 'deporte', 'equipos', 'ganador', 'hinchas', 'jugador', 'medalla', 'nadador', 'partido',
  'raqueta', 'tenista', 'torneos', 'tribuna', 'trofeos', 'triunfo',
  // Viajes y transporte
  'andenes', 'aviones', 'capitán', 'cohetes', 'marinos', 'pasajes', 'pilotos', 'piratas',
  'tesoros', 'tractor', 'turista', 'vagones', 'veleros', 'viajera', 'viajero',
  // Cosas lindas
  'abrazos', 'alegría', 'amistad', 'cariños', 'curioso', 'famosos', 'felices', 'sonrisa',
  // Verbos y números
  'abrazar', 'caminar', 'cocinar', 'dibujar', 'jugando', 'limpiar', 'ordenar', 'regalar', 'soñando',
  'volando', 'noventa', 'primero', 'segundo', 'sesenta', 'setenta', 'tercero', 'treinta',
  // Tecnología
  'batería', 'celular', 'consola', 'energía', 'monitor', 'química', 'teclado',
];

/**
 * Curated 10-letter words a daily Diez Letras set is built from (from
 * 4/10/2026): common, family-friendly and with a local flavor. The same checks
 * as above apply; the letters always spell one of these, the word with the prize.
 */
export const BASE_WORDS_10: readonly string[] = [
  // Animales
  'cocodrilos', 'golondrina', 'hipopótamo', 'luciérnaga', 'murciélago', 'picaflores',
  // Comidas y cocina
  'chocolates', 'chocolatín', 'chupetines', 'condimento', 'magdalenas', 'mandarinas', 'manzanilla',
  'medialunas', 'berenjenas', 'remolachas', 'zanahorias', 'tallarines', 'parrillada', 'pastelería',
  'confitería', 'panaderías', 'heladerías', 'carnicería', 'verdulería', 'almacenero',
  // La casa
  'aspiradora', 'calefactor', 'dormitorio', 'habitación', 'lavarropas', 'licuadoras', 'microondas',
  'mosquitero', 'tostadoras', 'ventanales', 'ventilador', 'jardinería', 'jardineros', 'margaritas',
  // Escuela y juegos
  'abecedario', 'adivinanza', 'biblioteca', 'cartuchera', 'crucigrama', 'escritorio', 'estudiante',
  'literatura', 'matemática', 'ortografía', 'pizarrones', 'profesores', 'respuestas', 'sacapuntas',
  'secundaria', 'soluciones', 'escondidas', 'escondites', 'barriletes', 'juguetería', 'historieta',
  'personajes', 'detectives', 'misterioso', 'divertidos', 'fantástico', 'gigantesco', 'maravillas',
  'simpáticos', 'caballeros', 'calendario', 'vacaciones', 'cumpleaños', 'guirnaldas', 'serpentina',
  // Deportes
  'campeonato', 'competidor', 'defensores', 'delanteros', 'entrenador', 'futbolista', 'gimnástica',
  'goleadores', 'olimpíadas', 'triunfador', 'acrobacias', 'trapecista', 'equilibrio',
  // Oficios y gente
  'arquitecto', 'astronauta', 'bailarinas', 'carpintero', 'científico', 'dibujantes', 'enfermeras',
  'escritores', 'espectador', 'ingenieros', 'inventores', 'periodista', 'pescadores', 'trabajador',
  'agricultor', 'campesinos', 'estanciero', 'milonguero', 'navegantes', 'explorador', 'aventurero',
  'caminantes', 'ciudadanos', 'habitantes', 'pobladores', 'familiares', 'compañeros', 'mensajeros',
  // Lugares y país
  'argentinos', 'cordobeses', 'patagónico', 'provincias', 'territorio', 'cordillera', 'vecindario',
  'plazoletas', 'hospitales', 'estaciones', 'aeropuerto', 'escenarios', 'tranqueras', 'alambrados',
  'cabalgatas', 'herraduras', 'chacareras', 'escarapela', 'libertador', 'revolución', 'presidente',
  'gobernador', 'intendente', 'festivales', 'carnavales',
  // Cosas y transporte
  'ambulancia', 'bicicletas', 'camionetas', 'colectivos', 'locomotora', 'submarinos', 'transporte',
  'pantalones', 'zapatillas', 'televisión', 'telescopio', 'termómetro', 'fotografía', 'esculturas',
  'carteleras', 'periódicos', 'noticieros', 'acordeones', 'panderetas', 'tamboriles',
  // Cielo y tiempo
  'astronomía', 'meteoritos', 'planetario', 'nubarrones', 'relámpagos', 'tormentoso',
  // Familia y fiestas
  'casamiento', 'matrimonio', 'nacimiento', 'graduación', 'dinosaurio',
];
