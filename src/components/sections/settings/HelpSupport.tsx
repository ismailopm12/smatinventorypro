 import { 
   HelpCircle, 
   MessageCircle, 
   FileText, 
   Mail, 
   ExternalLink,
   BookOpen,
   Video,
   Lightbulb,
   ChevronRight
 } from 'lucide-react';
 import {
   Sheet,
   SheetContent,
   SheetHeader,
   SheetTitle,
 } from '@/components/ui/sheet';
 import { cn } from '@/lib/utils';
 
 interface HelpSupportProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
 }
 
 const helpItems = [
   {
     title: 'Getting Started',
     description: 'Learn the basics of inventory management',
     icon: BookOpen,
     color: 'from-blue-500 to-cyan-500',
     bgColor: 'bg-blue-500/20',
     textColor: 'text-blue-600 dark:text-blue-400',
   },
   {
     title: 'Video Tutorials',
     description: 'Watch step-by-step guides',
     icon: Video,
     color: 'from-rose-500 to-pink-500',
     bgColor: 'bg-rose-500/20',
     textColor: 'text-rose-600 dark:text-rose-400',
   },
   {
     title: 'Tips & Tricks',
     description: 'Pro tips for power users',
     icon: Lightbulb,
     color: 'from-amber-500 to-orange-500',
     bgColor: 'bg-amber-500/20',
     textColor: 'text-amber-600 dark:text-amber-400',
   },
   {
     title: 'Documentation',
     description: 'Detailed feature documentation',
     icon: FileText,
     color: 'from-violet-500 to-purple-500',
     bgColor: 'bg-violet-500/20',
     textColor: 'text-violet-600 dark:text-violet-400',
   },
 ];
 
 const faqs = [
   {
     question: 'How do I add a new item?',
     answer: 'Go to the Items tab and tap the + button to add a new item with details like name, SKU, barcode, and category.',
   },
   {
     question: 'What is FIFO stock out?',
     answer: 'FIFO (First-In-First-Out) means older batches are used first when removing stock, ensuring proper inventory rotation.',
   },
   {
     question: 'How do alerts work?',
     answer: 'Alerts notify you when stock falls below minimum levels or when items are nearing expiry. Configure thresholds in Alert Settings.',
   },
   {
     question: 'Can I export my data?',
     answer: 'Yes! Use the Reports section to export CSV files, or Backend Export in Settings to export the full database schema.',
   },
 ];
 
 export function HelpSupport({ open, onOpenChange }: HelpSupportProps) {
   return (
     <Sheet open={open} onOpenChange={onOpenChange}>
       <SheetContent side="bottom" className="rounded-t-3xl border-0 px-0 pb-8 pt-0 max-h-[90vh] overflow-hidden">
         {/* Handle */}
         <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mt-3 mb-2" />
 
         {/* Header */}
         <div className="bg-gradient-to-br from-blue-500 via-blue-500 to-indigo-500 p-6 pb-8 mx-4 rounded-3xl mb-4">
           <SheetHeader>
             <SheetTitle className="flex items-center gap-4 text-white">
               <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm animate-fade-in">
                 <HelpCircle className="w-6 h-6" />
               </div>
               <div className="animate-fade-in" style={{ animationDelay: '50ms' }}>
                 <span className="text-xl font-bold block">Help & Support</span>
                 <p className="text-sm font-normal text-white/80 mt-0.5">Get help and learn more</p>
               </div>
             </SheetTitle>
           </SheetHeader>
         </div>
 
         {/* Content */}
         <div className="px-4 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
           {/* Quick Links */}
           <div className="grid grid-cols-2 gap-3">
             {helpItems.map((item, index) => {
               const Icon = item.icon;
               return (
                 <button
                   key={item.title}
                   className={cn(
                     "p-4 bg-muted/50 rounded-2xl text-left transition-all hover:bg-muted",
                     "touch-feedback animate-fade-in"
                   )}
                   style={{ animationDelay: `${index * 50}ms` }}
                 >
                   <div className={cn("p-2.5 rounded-xl w-fit mb-3", item.bgColor)}>
                     <Icon className={cn("w-5 h-5", item.textColor)} />
                   </div>
                   <p className="font-semibold text-sm">{item.title}</p>
                   <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                 </button>
               );
             })}
           </div>
 
           {/* FAQs */}
           <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
             <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
               <MessageCircle className="w-4 h-4 text-primary" />
               Frequently Asked Questions
             </h3>
             <div className="space-y-2">
               {faqs.map((faq, index) => (
                 <details
                   key={index}
                   className="group p-4 bg-muted/50 rounded-2xl"
                 >
                   <summary className="font-medium text-sm cursor-pointer list-none flex items-center justify-between">
                     {faq.question}
                     <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-90" />
                   </summary>
                   <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                     {faq.answer}
                   </p>
                 </details>
               ))}
             </div>
           </div>
 
           {/* Contact */}
           <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl animate-fade-in" style={{ animationDelay: '250ms' }}>
             <div className="flex items-center gap-3">
               <div className="p-2.5 bg-primary/20 rounded-xl">
                 <Mail className="w-5 h-5 text-primary" />
               </div>
               <div className="flex-1">
                 <p className="font-semibold text-sm">Need more help?</p>
                 <p className="text-xs text-muted-foreground">Contact our support team</p>
               </div>
               <ExternalLink className="w-4 h-4 text-muted-foreground" />
             </div>
           </div>
 
           {/* Version */}
           <p className="text-center text-xs text-muted-foreground">
             Warehouse Inventory v1.0.0 • Made with ❤️
           </p>
         </div>
       </SheetContent>
     </Sheet>
   );
 }