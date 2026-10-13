/**
 * เอกสารอ้างอิงภายนอกของหน้า `/research`
 *
 * ทุกรายการในไฟล์นี้เป็นงานที่ตีพิมพ์โดยผู้อื่น **ไม่ใช่ผลงานของโครงการนี้**
 * โครงการยังไม่มีงานตีพิมพ์ของตัวเอง หน้า `/research` ต้องพูดเรื่องนี้ให้ชัด
 *
 * กฎการเพิ่มรายการ (ต่อเนื่องจากคอมเมนต์เดิมใน `Research.tsx`):
 *
 * 1. ต้องมี DOI ที่เปิดแล้วเจอเอกสารจริง — ห้ามใส่ชื่อเรื่องที่ค้นไม่เจอ
 * 2. `summary_th` เขียนได้เฉพาะสิ่งที่อยู่ในบทคัดย่อของเอกสารนั้น
 *    ห้ามเติมตัวเลข กลุ่มตัวอย่าง หรือข้อสรุปที่ผู้เขียนไม่ได้เขียนไว้
 * 3. เอกสารที่บทคัดย่อไม่เปิดสาธารณะ ให้เขียนเท่าที่ชื่อเรื่องและวารสารบอก
 *    แล้วระบุตรง ๆ ว่าบทคัดย่อฉบับเต็มอยู่หลัง paywall
 * 4. `citations` คือค่าที่ดึงจาก OpenAlex ณ วันที่ใน `CITATION_SOURCE`
 *    ตัวเลขนี้เปลี่ยนตลอดเวลา จึงต้องแสดงวันที่กำกับเสมอ ห้ามแสดงลอย ๆ
 * 5. `relevance_th` คือเหตุผลที่งานนี้เกี่ยวกับแอป เขียนโดยทีมเรา ไม่ใช่คำพูดของผู้เขียน
 *
 * ตรวจแล้วเมื่อ 13 ต.ค. 2569 ผ่าน OpenAlex API (metadata + บทคัดย่อ),
 * Semantic Scholar (บทคัดย่อที่ OpenAlex ไม่มี) และ Crossref (ยืนยัน DOI)
 */

export type ResearchTopic = 'โรคพืช' | 'ความหวาน' | 'เศรษฐศาสตร์' | 'เทคโนโลยี AI';

export type PaperType = 'บทความวิจัย' | 'รายงานภาคสนาม' | 'ชุดข้อมูลเปิด';

export type Paper = {
  id: string;
  title: string;
  authors: string;
  venue: string;
  /** ปี ค.ศ. ตามที่ตีพิมพ์ — BibTeX ใช้ค่านี้ หน้าเว็บต้องกำกับว่าเป็น ค.ศ. */
  year: number;
  topic: ResearchTopic;
  type: PaperType;
  /** DOI แบบไม่มีโดเมน เช่น `10.3389/fpls.2016.01419` */
  doi: string;
  /** ลิงก์เปิดเอกสารต้นฉบับ */
  url: string;
  /** อ่านฉบับเต็มได้ฟรีหรือไม่ (จาก OpenAlex `open_access.is_oa`) */
  openAccess: boolean;
  /** จำนวนการอ้างอิงจาก OpenAlex ณ `CITATION_SOURCE.retrieved` */
  citations: number;
  /** สรุปจากบทคัดย่อของเอกสารนั้นเท่านั้น */
  summary_th: string;
  /** ทำไมงานนี้เกี่ยวกับ Watermelon AI — ความเห็นของทีมเรา */
  relevance_th: string;
};

export const CITATION_SOURCE = {
  name: 'OpenAlex',
  url: 'https://openalex.org',
  retrieved_th: '13 ต.ค. 2569',
} as const;

export const RESEARCH_TOPICS: readonly ResearchTopic[] = [
  'โรคพืช',
  'ความหวาน',
  'เศรษฐศาสตร์',
  'เทคโนโลยี AI',
];

export const PAPERS: readonly Paper[] = [
  // ─── โรคพืช ─────────────────────────────────────────────────────────
  {
    id: 'he-2020-watermelon-ssd',
    title: 'Watermelon Disease Detection Based on Deep Learning',
    authors: 'Xiao He, Kui Fang, Bo Qiao, Xinghui Zhu, Yineng Chen',
    venue: 'International Journal of Pattern Recognition and Artificial Intelligence',
    year: 2020,
    topic: 'โรคพืช',
    type: 'บทความวิจัย',
    doi: '10.1142/S0218001421520042',
    url: 'https://doi.org/10.1142/S0218001421520042',
    openAccess: false,
    citations: 17,
    summary_th:
      'ใช้ใบแตงโมเป็นวัตถุศึกษา แบ่งเป็นแอนแทรคโนส ใบไหม้ ใบจุด และใบปกติ ' +
      'ผู้เขียนปรับสูตรการตั้งกล่องเริ่มต้นของโมเดล SSD แล้วทดสอบกับ SSD หลายรุ่น ' +
      'รุ่น SSD768 ให้ความแม่นยำเฉลี่ย 92.4% และค่า IOU เฉลี่ย 88.9% ' +
      'และสรุปว่าวิธีนี้ใช้ตรวจโรคแตงโมในสภาพแวดล้อมธรรมชาติได้',
    relevance_th:
      'ชุดคลาสของงานนี้ใกล้เคียงกับ engine `legacy4` ของเรา (4 คลาส รวมใบปกติ) ' +
      'เป็นหลักฐานว่าการแยกโรคแตงโมจากภาพใบด้วยโครงข่ายประสาทเทียมทำได้จริง ' +
      'แต่เป็นคนละโมเดลและคนละชุดข้อมูลกับของเรา ตัวเลขของเขาใช้แทนของเราไม่ได้',
  },
  {
    id: 'madadum-2025-yolo-sam-thailand',
    title:
      'Optimizing watermelon leaf disease detection using SAM-based augmentation with YOLO for practical agricultural solutions',
    authors: 'Hadee Madadum, Fazal E Nasir, Kanjana Haruehansapong',
    venue: 'Smart Agricultural Technology',
    year: 2025,
    topic: 'โรคพืช',
    type: 'บทความวิจัย',
    doi: '10.1016/j.atech.2025.101326',
    url: 'https://doi.org/10.1016/j.atech.2025.101326',
    openAccess: true,
    citations: 8,
    summary_th:
      'ตรวจโรคแตงโมด้วย deep learning บนชุดข้อมูลที่เก็บจากแปลงจริงในประเทศไทย ' +
      'ผู้เขียนระบุว่าภาพจากแปลงต่างจากภาพที่ถ่ายในห้องทดลองเพราะควบคุมสภาพแวดล้อมไม่ได้ ' +
      'และชุดข้อมูลมีจำนวนภาพแต่ละคลาสไม่สมดุลชัดเจน จึงเสนอวิธีเพิ่มข้อมูลที่รวม ' +
      'Segment Anything Model (SAM) เข้ากับการแปลงภาพเชิงแสงและเชิงเรขาคณิต ' +
      'ผลทดลอง YOLOv9t ได้ค่าสูงสุดที่ 0.92 mAP50 และ 0.71 mAP95 ' +
      'ส่วนการวัดด้วย Accuracy per Inference Time พบว่า YOLOv11 ได้คะแนนสูงสุด',
    relevance_th:
      'เป็นงานที่ใกล้บริบทของเราที่สุดในรายการนี้ เพราะเก็บภาพจากแปลงแตงโมในไทย ' +
      'และยืนยันปัญหาสองข้อที่เราเจอเอง คือภาพแปลงจริงยากกว่าภาพห้องทดลอง ' +
      'และจำนวนภาพต่อคลาสไม่สมดุล ซึ่งเป็นเหตุผลที่เรารายงานผลแยกรายคลาส',
  },
  {
    id: 'khannum-2024-downy-mildew-vgg16',
    title:
      'Classification of Downy Mildew Disease in Watermelon Plant Leaf using VGG-16 Convolutional Neural Network',
    authors: 'Ayesha Khannum, R. Dhanesha, Y. Kantharaj',
    venue: 'International Conference on Mobile Networks and Wireless Communications (ICMNWC)',
    year: 2024,
    topic: 'โรคพืช',
    type: 'บทความวิจัย',
    doi: '10.1109/ICMNWC63764.2024.10872300',
    url: 'https://doi.org/10.1109/ICMNWC63764.2024.10872300',
    openAccess: false,
    citations: 4,
    summary_th:
      'โรคราน้ำค้าง (Downy Mildew) ที่เกิดจากเชื้อ Pseudoperonospora cubensis ' +
      'ทำให้ผลผลิตแตงโมลดลงอย่างมาก ผู้เขียนสร้างระบบตรวจอัตโนมัติด้วยโมเดล VGG-16 ' +
      'ฝึกและตรวจสอบบนชุดข้อมูล 585 ภาพ แบ่ง 80% สำหรับฝึกและ 20% สำหรับ validation ' +
      'รายงานความแม่นยำ 100% ทั้งสองขั้น โดยมีค่า loss 0.0325 และ 0.0098 ตามลำดับ',
    relevance_th:
      'ราน้ำค้างเป็นหนึ่งใน 4 คลาสของ `legacy4` จึงอ้างอิงเรื่องตัวโรคได้ ' +
      'แต่ตัวเลข 100% ในบทคัดย่อมาจากการแบ่ง train/validation ภายในชุดข้อมูลเดียว ' +
      'ไม่ได้ระบุชุดทดสอบอิสระ เป็นตัวอย่างว่าทำไมหน้า /evaluation ของเราจึง ' +
      'ต้องบอกขอบเขตของชุดทดสอบทุกครั้ง ไม่ใช่รายงานแค่ตัวเลขความแม่นยำ',
  },
  {
    id: 'bhatta-2022-anthracnose-race2-data',
    title:
      'Data on inheritance of race 2 anthracnose resistance in watermelon (Citrullus spp.) biparental mapping populations',
    authors:
      'Bed Prakash Bhatta, Edgar Correa, Takshay K. Patel, Todd C. Wehner, Kevin M. Crosby, Michael J. Thomson, Subas Malla',
    venue: 'Data in Brief',
    year: 2022,
    topic: 'โรคพืช',
    type: 'ชุดข้อมูลเปิด',
    doi: '10.1016/j.dib.2022.108546',
    url: 'https://doi.org/10.1016/j.dib.2022.108546',
    openAccess: true,
    citations: 2,
    summary_th:
      'โรคแอนแทรคโนสในแตงโมเกิดจากเชื้อรา Colletotrichum orbiculare ' +
      'ผู้เขียนสร้างประชากร F2 จากคู่ผสมสามคู่ที่ใช้สายพันธุ์ PI 189225 เป็นแหล่งความต้านทาน ' +
      'ปลูกเชื้อแอนแทรคโนส race 2 แล้วให้คะแนนรอยโรคบนใบด้วยสายตาหลังปลูกเชื้อ 7 วัน ' +
      'ตั้งแต่ 0% (ไม่มีรอยโรค) ถึง 100% (ใบจริงตาย) และเผยแพร่ชุดข้อมูลที่ได้',
    relevance_th:
      'เป็นข้อมูลด้านพันธุกรรมความต้านทาน ไม่ใช่ข้อมูลภาพสำหรับฝึกโมเดล ' +
      'ใช้อ้างอิงเวลาพูดถึงการเลือกสายพันธุ์ต้านแอนแทรคโนสในคู่มือปลูก ' +
      'และเป็นตัวอย่างมาตรฐานการให้คะแนนความรุนแรงของโรคที่ตรวจสอบย้อนกลับได้',
  },

  // ─── ความหวานและความสุก ────────────────────────────────────────────
  {
    id: 'chen-2017-acoustic-wavelet',
    title:
      'Watermelon ripeness detection by wavelet multiresolution decomposition of acoustic impulse response signals',
    authors: 'Xuan Chen, Peipei Yuan, Xiaoyan Deng',
    venue: 'Postharvest Biology and Technology',
    year: 2017,
    topic: 'ความหวาน',
    type: 'บทความวิจัย',
    doi: '10.1016/j.postharvbio.2017.08.018',
    url: 'https://doi.org/10.1016/j.postharvbio.2017.08.018',
    openAccess: false,
    citations: 36,
    summary_th:
      'เสนอวิธีตรวจความสุกของแตงโมที่เรียบง่ายและต้นทุนต่ำ โดยแยกสัญญาณเสียงเคาะ ' +
      'ด้วย wavelet multi-resolution decomposition แล้วมองค่าสัมประสิทธิ์แต่ละตัว ' +
      'เป็นตัวแปรสุ่ม เปรียบเทียบการแจกแจงระหว่างแตงโมสุกกับไม่สุก ' +
      'แล้วตั้งเกณฑ์ตัดสินจากการทดสอบสมมติฐานที่ระดับนัยสำคัญ 5% ' +
      'ได้ความแม่นยำบนชุดฝึก 91.67% และชุดทดสอบ 91.76%',
    relevance_th:
      'เป็นฐานอ้างอิงของการเคาะฟังเสียงที่ `/scanner` ใช้ และชี้จุดสำคัญว่า ' +
      'สิ่งที่วิธีนี้ทำได้คือ "แยกสุก/ไม่สุก" ไม่ใช่การทำนายค่า °Brix ' +
      'ตรงกับที่ API ของเราคืนค่า `brix_estimate: null` จากเสียงเคาะ',
  },
  {
    id: 'yamamoto-1981-acoustic-impulse',
    title:
      'Nondestructive Acoustic Impulse Response Method for Measuring Internal Quality of Apples and Watermelons',
    authors: 'Hiromichi Yamamoto, Mutsuo Iwamoto, Shiko Haginuma',
    venue: 'Journal of the Japanese Society for Horticultural Science',
    year: 1981,
    topic: 'ความหวาน',
    type: 'บทความวิจัย',
    doi: '10.2503/jjshs.50.247',
    url: 'https://doi.org/10.2503/jjshs.50.247',
    openAccess: true,
    citations: 34,
    summary_th:
      'ทดสอบการวัดคุณภาพภายในแบบไม่ทำลายด้วยวิธี acoustic impulse response ในแอปเปิลและแตงโม ' +
      'เทียบดัชนีจากเสียงกับผลการกดทดสอบเนื้อด้วยความเร็วคงที่และคะแนนจากการชิม ' +
      'พบความสัมพันธ์อย่างมีนัยสำคัญสูงระหว่างดัชนีเสียง ค่ามอดุลัสของยังปรากฏ ' +
      'ความเค้นที่จุดแตก และความแน่นเนื้อจากประสาทสัมผัส ' +
      'และสรุปว่าวิธีนี้ประเมินคุณภาพเนื้อภายในที่ดูจากภายนอกไม่ได้',
    relevance_th:
      'เป็นต้นทางของวิธีเคาะฟังเสียงที่ใช้กันมาถึงปัจจุบัน ' +
      'ข้อสรุปของงานนี้ผูกเสียงเข้ากับ "ความแน่นเนื้อ" ไม่ใช่ "ความหวาน" ' +
      'จึงเป็นเหตุผลเชิงวิชาการที่เราไม่แสดงค่าความหวานจากเสียงเคาะ',
  },
  {
    id: 'sun-2010-nondestructive-review',
    title:
      'Research advances in nondestructive determination of internal quality in watermelon/melon: A review',
    authors: 'Tong Sun, Kang Huang, Huirong Xu, Yibin Ying',
    venue: 'Journal of Food Engineering',
    year: 2010,
    topic: 'ความหวาน',
    type: 'บทความวิจัย',
    doi: '10.1016/j.jfoodeng.2010.05.019',
    url: 'https://doi.org/10.1016/j.jfoodeng.2010.05.019',
    openAccess: false,
    citations: 105,
    summary_th:
      'บทความทบทวนความก้าวหน้าของการตรวจคุณภาพภายในแตงโมและเมลอนแบบไม่ทำลาย ' +
      'ตีพิมพ์ใน Journal of Food Engineering และถูกอ้างอิงมากที่สุดในกลุ่มนี้ ' +
      '— บทคัดย่อฉบับเต็มไม่เปิดให้เข้าถึงผ่าน OpenAlex, Semantic Scholar หรือ Crossref ' +
      'จึงไม่สรุปเนื้อหาภายในที่นี่ กรุณาเปิดอ่านจากลิงก์ DOI',
    relevance_th:
      'เป็นจุดตั้งต้นสำหรับใครที่จะทำเรื่องวัดความหวานแบบไม่ทำลายต่อ ' +
      'รวมวิธีหลายแบบไว้ในที่เดียว ก่อนจะลงรายละเอียดเป็นงานรายวิธี',
  },
  {
    id: 'wang-2023-vis-nir-cnn-ssc',
    title:
      'Determination of watermelon soluble solids content based on visible/near infrared spectroscopy with convolutional neural network',
    authors: 'Guantian Wang, Xiaogang Jiang, Xiong Li, Yande Liu, Yu Rao, Yu Zhang, Manyu Xin',
    venue: 'Infrared Physics & Technology',
    year: 2023,
    topic: 'ความหวาน',
    type: 'บทความวิจัย',
    doi: '10.1016/j.infrared.2023.104825',
    url: 'https://doi.org/10.1016/j.infrared.2023.104825',
    openAccess: false,
    citations: 29,
    summary_th:
      'วัดปริมาณของแข็งที่ละลายน้ำได้ (soluble solids content ซึ่งรายงานเป็น °Brix) ในแตงโม ' +
      'ด้วยสเปกโทรสโกปีช่วงแสงที่มองเห็นและอินฟราเรดใกล้ ร่วมกับโครงข่ายประสาทเทียมแบบคอนโวลูชัน ' +
      '— บทคัดย่อฉบับเต็มไม่เปิดให้เข้าถึงผ่าน OpenAlex, Semantic Scholar หรือ Crossref ' +
      'จึงระบุได้เพียงวิธีและเป้าหมายตามชื่อเรื่อง กรุณาเปิดอ่านจากลิงก์ DOI',
    relevance_th:
      'ชี้ว่าการประมาณค่า °Brix จากภายนอกต้องใช้สเปกตรัมแสง ไม่ใช่ภาพถ่ายธรรมดาหรือเสียงเคาะ ' +
      'เป็นเหตุผลที่แอปของเราไม่ทำนายความหวานจากกล้องมือถือ ' +
      'และต้องให้ผู้ใช้กรอกค่าที่วัดด้วยเครื่องวัดจริงเท่านั้น',
  },

  // ─── เศรษฐศาสตร์และการผลิต ─────────────────────────────────────────
  {
    id: 'sawe-2020-pollination-yield',
    title:
      'Enhancing pollination is more effective than increased conventional agriculture inputs for improving watermelon yields',
    authors: 'Thomas Sawe, Katrine Eldegard, Ørjan Totland, Samora M. Andrew, Anders Nielsen',
    venue: 'Ecology and Evolution',
    year: 2020,
    topic: 'เศรษฐศาสตร์',
    type: 'รายงานภาคสนาม',
    doi: '10.1002/ece3.6278',
    url: 'https://doi.org/10.1002/ece3.6278',
    openAccess: true,
    citations: 26,
    summary_th:
      'การทดลองในแปลงจริงทางตอนเหนือของแทนซาเนีย ทดสอบว่าความอุดมของดิน ความชื้นดิน ' +
      'หรือการผสมเกสร เป็นตัวจำกัดผลผลิตแตงโม ด้วยการทดลองแบบแฟกทอเรียลสามปัจจัย ' +
      'ผลคือการเพิ่มการผสมเกสรทำให้โอกาสที่ต้นจะให้ผลที่สองขนาดขายได้เพิ่มขึ้นอย่างมีนัยสำคัญ ' +
      'และทำให้ปริมาณน้ำตาล (brix) ในผลสูงขึ้น ขณะที่การใส่ปุ๋ยเพิ่มหรือให้น้ำเพิ่ม ' +
      'ไม่ได้ทำให้ผลผลิต น้ำหนักผล ความหวาน หรือสีเนื้อดีขึ้นอย่างมีนัยสำคัญ',
    relevance_th:
      'เตือนไม่ให้ระบบแนะนำ "ใส่ปุ๋ยเพิ่ม" เป็นคำตอบอัตโนมัติเมื่อผลผลิตตก ' +
      'ในการทดลองนี้ต้นทุนที่เพิ่มไปกับปุ๋ยและน้ำไม่ได้แปลงเป็นผลผลิต ' +
      'แต่เป็นงานในแทนซาเนีย เงื่อนไขดินและชนิดแมลงผสมเกสรต่างจากไทย อ่านเป็นบริบท ไม่ใช่สูตร',
  },
  {
    id: 'kaur-2024-postharvest-review',
    title:
      'A Scoping Review of Postharvest Losses, Supply Chain Management, and Technology: Implications for Produce Quality in Developing Countries',
    authors: 'Raminder Kaur, Jonathan Adam Watson',
    venue: 'Journal of the ASABE',
    year: 2024,
    topic: 'เศรษฐศาสตร์',
    type: 'บทความวิจัย',
    doi: '10.13031/ja.15660',
    url: 'https://doi.org/10.13031/ja.15660',
    openAccess: false,
    citations: 58,
    summary_th:
      'ทบทวนวรรณกรรม 385 ชิ้นเรื่องความสูญเสียหลังการเก็บเกี่ยว การจัดการห่วงโซ่อุปทาน ' +
      'และเทคโนโลยี พบว่าขั้นตอนหลังเก็บเกี่ยว เช่น การขนย้าย การลดอุณหภูมิ การล้างและสุขาภิบาล ' +
      'การคัดเกรด บรรจุภัณฑ์ การเก็บรักษาและการขนส่ง มีผลต่อคุณภาพผลผลิต ' +
      'แต่ผู้เกี่ยวข้องในประเทศกำลังพัฒนามักขาดโครงสร้างพื้นฐาน อุปกรณ์ และเงินทุน ' +
      'จึงเกิดความสูญเสียสูง ส่วนเทคโนโลยีห้องเย็น ปัญญาประดิษฐ์ และระบบตามรอยสินค้า ' +
      'ช่วยได้มาก แต่ยังติดอุปสรรคด้านการเงิน สังคม และกฎระเบียบ',
    relevance_th:
      'วางกรอบว่าการวินิจฉัยโรคได้เร็วเป็นเพียงส่วนเดียวของรายได้เกษตรกร ' +
      'ความสูญเสียหลังเก็บเกี่ยวอยู่คนละขั้นของห่วงโซ่และเป็นเรื่องที่แอปนี้ยังไม่แตะ',
  },

  // ─── เทคโนโลยี AI ──────────────────────────────────────────────────
  {
    id: 'mohanty-2016-plantvillage',
    title: 'Using Deep Learning for Image-Based Plant Disease Detection',
    authors: 'Sharada P. Mohanty, David P. Hughes, Marcel Salathé',
    venue: 'Frontiers in Plant Science',
    year: 2016,
    topic: 'เทคโนโลยี AI',
    type: 'บทความวิจัย',
    doi: '10.3389/fpls.2016.01419',
    url: 'https://doi.org/10.3389/fpls.2016.01419',
    openAccess: true,
    citations: 5012,
    summary_th:
      'ฝึกโครงข่ายประสาทเทียมเชิงลึกบนชุดข้อมูลสาธารณะ 54,306 ภาพของใบพืชที่เป็นโรคและใบปกติ ' +
      'ซึ่งถ่ายในสภาพควบคุม ครอบคลุมพืช 14 ชนิดและโรค 26 ชนิด ' +
      'ได้ความแม่นยำ 99.35% บนชุดทดสอบที่กันไว้ ผู้เขียนสรุปว่าแนวทางนี้ ' +
      'เปิดทางให้การวินิจฉัยโรคพืชผ่านสมาร์ตโฟนเป็นไปได้ในวงกว้าง',
    relevance_th:
      'เป็นงานที่ทำให้ทั้งสาขานี้เริ่มต้น และเป็นที่มาของชุดข้อมูล PlantVillage ' +
      'ข้อความสำคัญคือคำว่า "ถ่ายในสภาพควบคุม" — ความแม่นยำ 99.35% เป็นตัวเลขของภาพแบบนั้น ' +
      'ไม่ใช่ของภาพที่เกษตรกรถ่ายกลางแปลง ซึ่งเป็นช่องว่างที่แอปของเราต้องยอมรับตรง ๆ',
  },
  {
    id: 'barbedo-2018-factors',
    title: 'Factors influencing the use of deep learning for plant disease recognition',
    authors: 'Jayme Garcia Arnal Barbedo',
    venue: 'Biosystems Engineering',
    year: 2018,
    topic: 'เทคโนโลยี AI',
    type: 'บทความวิจัย',
    doi: '10.1016/j.biosystemseng.2018.05.013',
    url: 'https://doi.org/10.1016/j.biosystemseng.2018.05.013',
    openAccess: false,
    citations: 644,
    summary_th:
      'ชี้ว่าผลลัพธ์ที่ดูดีของ deep learning ในงานวินิจฉัยโรคพืช ' +
      'มักบังปัญหาบางอย่างที่การทดลองไม่ค่อยคำนึงถึง ' +
      'บทความวิเคราะห์ปัจจัยหลักที่มีผลต่อการออกแบบและประสิทธิภาพของโครงข่าย ' +
      'ทั้งข้อดีและข้อเสีย เพื่อให้ได้ข้อสรุปที่สมจริงขึ้น ' +
      'โดยอ้างอิงทั้งงานในวรรณกรรมและการทดลองบนฐานข้อมูลภาพเกือบ 50,000 ภาพ ' +
      'ที่สร้างให้สะท้อนเงื่อนไขที่พบจริงในทางปฏิบัติ และเปิดให้ใช้เพื่อการศึกษา',
    relevance_th:
      'เป็นงานที่ควรอ่านคู่กับ Mohanty 2016 เสมอ เพราะอธิบายว่าทำไมตัวเลขความแม่นยำสูง ๆ ' +
      'ถึงไม่ย้ายไปอยู่ในแปลงจริง เป็นฐานของกฎในโปรเจกต์เราที่ห้ามนำตัวเลขความแม่นยำ ' +
      'ของชุดทดสอบหนึ่งไปใช้กับ engine หรือชุดข้อมูลอื่น',
  },
  {
    id: 'guo-2017-calibration',
    title: 'On Calibration of Modern Neural Networks',
    authors: 'Chuan Guo, Geoff Pleiss, Yu Sun, Kilian Q. Weinberger',
    venue: 'arXiv preprint (ภายหลังตีพิมพ์ใน ICML 2017)',
    year: 2017,
    topic: 'เทคโนโลยี AI',
    type: 'บทความวิจัย',
    doi: '10.48550/arXiv.1706.04599',
    url: 'https://doi.org/10.48550/arXiv.1706.04599',
    openAccess: true,
    citations: 2346,
    summary_th:
      'การปรับเทียบความมั่นใจ คือการทำให้ค่าความน่าจะเป็นที่โมเดลให้ ' +
      'สะท้อนโอกาสที่คำตอบจะถูกจริง ผู้เขียนพบว่าโครงข่ายประสาทเทียมสมัยใหม่ ' +
      'ปรับเทียบได้แย่กว่าของเมื่อสิบปีก่อน โดยความลึก ความกว้าง weight decay ' +
      'และ Batch Normalization ล้วนมีผล ' +
      'และพบว่า temperature scaling ซึ่งมีพารามิเตอร์เดียว ' +
      'ได้ผลดีอย่างน่าประหลาดใจในการปรับเทียบคำทำนายบนชุดข้อมูลส่วนใหญ่',
    relevance_th:
      'เป็นที่มาโดยตรงของฟิลด์ `calibration.temperature` ในเซอร์วิสวิเคราะห์ภาพของเรา ' +
      'และเป็นเหตุผลที่ `/api/v1/health` บอกว่ายังไม่ได้ปรับเทียบ (temperature = 1.0) ' +
      'ตัวเลขความมั่นใจที่ยังไม่ปรับเทียบมักสูงกว่าความถูกต้องจริง จึงห้ามเรียกว่า "ความน่าจะเป็น"',
  },
  {
    id: 'tan-2019-efficientnet',
    title: 'EfficientNet: Rethinking Model Scaling for Convolutional Neural Networks',
    authors: 'Mingxing Tan, Quoc V. Le',
    venue: 'arXiv preprint (ภายหลังตีพิมพ์ใน ICML 2019)',
    year: 2019,
    topic: 'เทคโนโลยี AI',
    type: 'บทความวิจัย',
    doi: '10.48550/arXiv.1905.11946',
    url: 'https://doi.org/10.48550/arXiv.1905.11946',
    openAccess: true,
    citations: 4871,
    summary_th:
      'ศึกษาการขยายขนาดโมเดลอย่างเป็นระบบ และพบว่าการปรับสมดุลระหว่างความลึก ' +
      'ความกว้าง และความละเอียดของภาพพร้อมกันให้ผลดีกว่าการขยายมิติเดียว ' +
      'จึงเสนอวิธีขยายทุกมิติด้วยสัมประสิทธิ์ร่วมตัวเดียว ' +
      'แล้วใช้ neural architecture search ออกแบบโมเดลฐานจนได้ตระกูล EfficientNet ' +
      'โดย EfficientNet-B7 ได้ความแม่นยำ top-1 บน ImageNet ที่ 84.3% ' +
      'ขณะที่เล็กกว่า 8.4 เท่าและเร็วกว่า 6.1 เท่าเมื่อเทียบกับโมเดลที่ดีที่สุดก่อนหน้า',
    relevance_th:
      'โมเดลวินิจฉัยโรคของเราใช้สถาปัตยกรรม `efficientnet_b0` ซึ่งเป็นรุ่นเล็กที่สุดในตระกูลนี้ ' +
      'เอกสารนี้คือที่มาของสถาปัตยกรรม ไม่ใช่ผลวัดของโมเดลเรา ' +
      'ตัวเลข 84.3% เป็นของ EfficientNet-B7 บน ImageNet ไม่เกี่ยวกับความแม่นยำบนภาพใบแตงโม',
  },
];
