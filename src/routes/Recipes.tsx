import { useRef, useState } from 'react';
import { AppShell, PageContainer, PageHeading } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Link } from '../lib/router';
import { printElement } from '../lib/export';
import { cn } from '../lib/cn';
import { RECIPES, RECIPE_CATEGORIES, type Recipe } from '../data/recipes';

type Category = (typeof RECIPE_CATEGORIES)[number];

const CATEGORY_TONE: Record<Recipe['category'], string> = {
  เครื่องดื่ม: 'bg-primary-fixed text-on-primary-fixed-variant',
  ของหวาน: 'bg-secondary-container text-on-secondary-fixed-variant',
  อาหารคาว: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  แปรรูปขาย: 'bg-surface-high text-on-surface-variant',
};

const DIFFICULTY_TONE: Record<Recipe['difficulty'], 'secondary' | 'primary' | 'neutral'> = {
  ง่าย: 'secondary',
  ปานกลาง: 'primary',
  ต้องฝึก: 'neutral',
};

function RecipeCard({ recipe, open, onToggle }: { recipe: Recipe; open: boolean; onToggle: () => void }) {
  const panelId = `recipe-${recipe.id}`;

  return (
    <Card as="article" className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-title-md font-bold text-on-surface">{recipe.name}</h3>
          <p className="mt-1 text-body-md text-on-surface-variant">{recipe.summary}</p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-0.5 text-caption font-semibold whitespace-nowrap',
            CATEGORY_TONE[recipe.category],
          )}
        >
          {recipe.category}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'เวลาทำ', value: `${recipe.minutes} นาที`, icon: 'schedule' },
          { label: 'ได้', value: `${recipe.servings} ที่`, icon: 'restaurant' },
          { label: 'ความหวานที่เหมาะ', value: recipe.idealBrix, icon: 'science' },
          { label: 'ระดับความยาก', value: recipe.difficulty, icon: 'signal_cellular_alt' },
        ].map((item) => (
          <div key={item.label} className="rounded-md bg-surface-low p-3">
            <dt className="flex items-center gap-1 text-caption text-on-surface-variant">
              <Icon name={item.icon} size={13} />
              {item.label}
            </dt>
            <dd className="mt-0.5 text-label-lg font-bold text-on-surface">{item.value}</dd>
          </div>
        ))}
      </dl>

      {recipe.margin ? (
        <div className="flex items-center gap-2 rounded-md bg-mint-mist p-3">
          <Icon name="payments" size={18} className="shrink-0 text-secondary" />
          <p className="text-body-md text-on-surface-variant">
            <span className="font-bold text-on-surface">ขายได้จริง:</span> {recipe.margin}
          </p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex cursor-pointer items-center justify-between rounded-md bg-surface-low px-4 py-2.5 text-label-lg font-semibold text-on-surface transition-colors hover:bg-surface-container"
      >
        {open ? 'ย่อวิธีทำ' : 'ดูส่วนผสมและวิธีทำ'}
        <Icon name={open ? 'expand_less' : 'expand_more'} size={20} className="text-on-surface-variant" />
      </button>

      {open ? (
        <div id={panelId} className="flex flex-col gap-4">
          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-label-lg font-bold text-on-surface">
              <Icon name="list_alt" size={16} className="text-primary" />
              ส่วนผสม
            </h4>
            <ul className="flex flex-col gap-1.5">
              {recipe.ingredients.map((item) => (
                <li key={item} className="flex items-start gap-2 text-body-md text-on-surface-variant">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-label-lg font-bold text-on-surface">
              <Icon name="menu_book" size={16} className="text-secondary" />
              วิธีทำ
            </h4>
            <ol className="flex flex-col gap-2">
              {recipe.steps.map((step, index) => (
                <li key={step} className="flex items-start gap-3 text-body-md text-on-surface-variant">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary-container text-caption font-bold text-on-secondary-fixed-variant">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <div className="flex items-start gap-2 rounded-md bg-melon-tint p-4">
            <Icon name="lightbulb" size={18} className="mt-0.5 shrink-0 text-primary" />
            <p className="text-body-md text-on-surface-variant">
              <span className="font-bold text-on-surface">เคล็ดลับ:</span> {recipe.tip}
            </p>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

export function Recipes() {
  const [category, setCategory] = useState<Category>('ทั้งหมด');
  const [openId, setOpenId] = useState<string | null>(RECIPES[0].id);
  const sheet = useRef<HTMLDivElement>(null);

  const filtered = category === 'ทั้งหมด' ? RECIPES : RECIPES.filter((recipe) => recipe.category === category);
  const commercial = RECIPES.filter((recipe) => recipe.margin);

  return (
    <AppShell>
      <PageContainer>
        <PageHeading
          eyebrow={
            <Badge tone="secondary">
              <Icon name="restaurant" size={14} />
              สูตรอาหาร {RECIPES.length} รายการ
            </Badge>
          }
          title="สูตรเครื่องดื่ม & ขนมแตงโม"
          description="ใช้ผลผลิตให้คุ้มทุกส่วน ตั้งแต่เนื้อไปจนถึงเปลือก พร้อมสูตรแปรรูปที่ขายต่อได้จริงสำหรับผลตกเกรด"
          actions={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpenId(null);
                printElement(sheet.current, 'สูตรแตงโม Watermelon AI');
              }}
            >
              <Icon name="download" size={18} />
              ดาวน์โหลดสูตรทั้งหมด
            </Button>
          }
        />

        <Card className="mb-5 flex flex-wrap items-center justify-between gap-5 bg-mint-mist">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-on-secondary">
              <Icon name="recycling" size={22} />
            </span>
            <div>
              <h2 className="text-title-md font-bold text-on-surface">ผลตกเกรดไม่ใช่ของเสีย</h2>
              <p className="mt-1 max-w-[70ch] text-body-md text-on-surface-variant">
                ผลแตกจากฝน ผลเล็กไซส์ C และเปลือกที่เหลือจากการขายเนื้อ รวมกันคิดเป็นราว 40%
                ของผลผลิตที่มักถูกทิ้ง สูตรแปรรูป {commercial.length} รายการด้านล่างเปลี่ยนส่วนนั้นเป็นรายได้เพิ่ม
              </p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setCategory('แปรรูปขาย')}>
            ดูสูตรแปรรูปขาย
            <Icon name="arrow_forward" size={16} />
          </Button>
        </Card>

        <div className="mb-5 flex flex-wrap items-center gap-2">
          {RECIPE_CATEGORIES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              aria-pressed={category === item}
              className={cn(
                'cursor-pointer rounded-full px-4 py-2 text-label-md font-semibold transition-all duration-150 ease-tactile active:scale-[0.96]',
                category === item
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-lowest text-on-surface-variant hover:bg-surface-container',
              )}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2" ref={sheet}>
          {filtered.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              open={openId === recipe.id}
              onToggle={() => setOpenId(openId === recipe.id ? null : recipe.id)}
            />
          ))}
        </div>

        <Card className="mt-6 flex flex-wrap items-center justify-between gap-5 bg-primary text-on-primary">
          <div className="flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-on-primary/15">
              <Icon name="science" size={26} />
            </span>
            <div>
              <p className="text-headline-sm font-bold">ไม่รู้ว่าแตงโมหวานพอไหม?</p>
              <p className="mt-0.5 text-body-md text-primary-fixed">
                วัดค่า Brix ก่อนเริ่มทำ จะได้รู้ว่าต้องเติมน้ำตาลเพิ่มเท่าไหร่
              </p>
            </div>
          </div>
          <Link
            to="/scanner"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-on-primary px-5 text-label-lg font-semibold text-primary transition-transform duration-150 ease-tactile active:scale-[0.96]"
          >
            <Icon name="graphic_eq" size={18} />
            วัดความหวานก่อน
          </Link>
        </Card>
      </PageContainer>
    </AppShell>
  );
}
